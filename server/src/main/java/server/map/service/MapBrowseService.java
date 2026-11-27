package server.map.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.global.common.LocalizedText;
import server.global.common.Times;
import server.global.common.UserSummary;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.MapBrowseQueries;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.map.service.MapBrowseRanking.Candidate;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.safety.repository.BlockRepository;
import server.tag.domain.Tag;
import server.tag.domain.UserTag;
import server.tag.repository.UserTagRepository;
import server.trip.repository.TripRepository;
import server.user.domain.MatchPreference;
import server.user.domain.Role;
import server.user.domain.User;
import server.user.domain.UserStatus;
import server.user.repository.MatchPreferenceRepository;
import server.user.repository.UserRepository;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * [서버 B] 지도 고르기(MAP-07)·공개 스팟 미리보기(MAP-08) — 화면 명세 v9 T-11, T-11b.
 * 카드 1장 = 지도 1개. 고를 수 있는 기준은 MapSelectability 로 MATCH-01 과 맞춘다.
 * 숨긴 스팟은 개수만 준다 (이름·사진·좌표는 응답에 넣지 않는다).
 */
@Service
@RequiredArgsConstructor
public class MapBrowseService {

    static final String MAP_LANG = "ko";
    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;
    private final MatchPreferenceRepository preferenceRepository;
    private final TripRepository tripRepository;
    private final UserTagRepository userTagRepository;
    private final SecretMapRepository mapRepository;
    private final SpotRepository spotRepository;
    private final MatchRepository matchRepository;
    private final BlockRepository blockRepository;
    private final MapBrowseQueries queries;
    private final MapSelectability selectability;
    private final MapVisibility mapVisibility;
    private final PolicyProperties policy;
    private final Clock clock;

    /** MAP-07 지도 고르기 (동네 조건 없이) */
    @Transactional(readOnly = true)
    public MapBrowseResponse browse(UUID travelerId, String sortParam, Integer minPins, Integer maxPins,
                                    Integer page, Integer size) {
        return browse(travelerId, sortParam, minPins, maxPins, null, page, size);
    }

    /**
     * MAP-07 지도 고르기
     * @param areaTagId 위쪽 미니 지도에서 고른 동네(AREA 태그 id). null 이면 전체
     */
    @Transactional(readOnly = true)
    public MapBrowseResponse browse(UUID travelerId, String sortParam, Integer minPins, Integer maxPins,
                                    Long areaTagId, Integer page, Integer size) {
        MapBrowseSort sort = MapBrowseSort.from(sortParam);
        MapBrowseRanking.validatePinRange(minPins, maxPins, policy.mapMinSpots());
        int pageNo = page == null ? 0 : page;
        int pageSize = size == null ? policy.mateListPageSize() : size;
        MapBrowseRanking.validatePage(pageNo, pageSize, MAX_PAGE_SIZE);

        LocalDate today = LocalDate.now(clock);
        TravelerContext ctx = traveler(travelerId, today);

        // 1) 활동 중 메이트와 목록 조건
        Map<UUID, User> mateById = queries.findUsers(Role.MATE, UserStatus.ACTIVE).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        Set<UUID> blocked = new HashSet<>(blockRepository.findBlockedRelations(travelerId));
        Map<UUID, Long> activeByMate = toLongMap(mateById.isEmpty() ? List.<Object[]>of()
                : queries.countActiveByMate(mateById.keySet(), MatchStatus.ACTIVE));
        Set<UUID> listable = mateById.values().stream()
                .filter(m -> selectability.mateListable(ctx.traveler(), ctx.pref(), m, blocked,
                        activeByMate.getOrDefault(m.getId(), 0L)))
                .map(User::getId)
                .collect(Collectors.toSet());

        // 2) 내가 이미 고른 지도 (조건과 상관없이 카드에 나온다)
        Map<Long, Long> myMatchByMap = myMatchesByMap(travelerId);

        // 3) 후보 지도 = 목록 조건을 통과한 메이트의 공개 지도 + 내가 고른 지도
        List<SecretMap> maps = mateById.isEmpty() ? List.of() : queries.findMapsOf(mateById.keySet());
        Map<Long, long[]> spotStats = spotStats(maps.stream().map(SecretMap::getId).toList());
        List<SecretMap> candidateMaps = maps.stream()
                .filter(m -> myMatchByMap.containsKey(m.getId())
                        || (listable.contains(m.getMateId()) && isPublic(spotStats.get(m.getId()))))
                .toList();
        // 동네 목록 (미니 지도 말풍선 순서 = 태그 순서)
        TagIndex tags = TagIndex.of(queries.findAllTags());
        if (areaTagId != null && !tags.isArea(areaTagId)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        String lang = ctx.traveler().getLanguage();
        if (candidateMaps.isEmpty()) {
            return new MapBrowseResponse(List.of(), 0, EmptyReason.NO_MATE, pageNo, false,
                    areaCounts(tags, List.of(), lang));
        }

        // 4) 겹치는 취향 수(동네 제외, 세부는 항목으로 묶음)·동네·선택 횟수 → 필터·정렬·페이지
        Set<Long> travelerTagIds = userTagRepository.findByUserId(travelerId).stream()
                .map(UserTag::getTagId).collect(Collectors.toSet());
        Set<Long> travelerTaste = tags.tasteKeys(travelerTagIds);
        Set<Long> travelerAreas = tags.areas(travelerTagIds);
        Set<UUID> candidateMates = candidateMaps.stream().map(SecretMap::getMateId).collect(Collectors.toSet());
        Map<UUID, Set<Long>> tagsByMate = queries.findTagsOf(candidateMates).stream()
                .collect(Collectors.groupingBy(UserTag::getUserId,
                        Collectors.mapping(UserTag::getTagId, Collectors.toSet())));
        Map<Long, Long> areaByMap = areaOfMaps(candidateMaps, tags);
        Map<Long, Long> selectedByMap = toLongMap(
                queries.countSelectedByMap(candidateMaps.stream().map(SecretMap::getId).toList()));

        List<Candidate> candidates = candidateMaps.stream()
                .map(m -> {
                    Set<Long> mateTags = tagsByMate.getOrDefault(m.getMateId(), Set.of());
                    Set<Long> common = new HashSet<>(tags.tasteKeys(mateTags));
                    common.retainAll(travelerTaste);
                    Long area = areaByMap.get(m.getId());
                    boolean areaMatch = (area != null && travelerAreas.contains(area))
                            || tags.areas(mateTags).stream().anyMatch(travelerAreas::contains);
                    return new Candidate(m.getId(), m.getMateId(), spotStats.getOrDefault(m.getId(), new long[2])[0],
                            m.getUpdatedAt(), selectedByMap.getOrDefault(m.getId(), 0L), common.size(),
                            area, areaMatch ? 1 : 0);
                })
                .toList();
        List<Candidate> inRange = MapBrowseRanking.rank(candidates, sort, minPins, maxPins);
        List<AreaCount> areas = areaCounts(tags, inRange, lang);          // 말풍선 숫자는 동네 조건을 빼고 센다
        List<Candidate> filtered = areaTagId == null ? inRange
                : inRange.stream().filter(c -> areaTagId.equals(c.areaTagId())).toList();
        MapBrowseRanking.Page result = MapBrowseRanking.page(filtered, pageNo, pageSize);

        Map<Long, SecretMap> mapById = candidateMaps.stream()
                .collect(Collectors.toMap(SecretMap::getId, Function.identity()));
        List<MapCard> cards = result.items().stream()
                .map(c -> new MapCard(c.mapId(), title(mapById.get(c.mapId())),
                        UserSummary.of(mateById.get(c.mateId()), today), c.pinCount(),
                        Times.kst(c.updatedAt()), c.selectedCount(), myMatchByMap.get(c.mapId()),
                        tags.areaView(c.areaTagId(), lang)))
                .toList();
        EmptyReason empty = result.totalCount() == 0 ? EmptyReason.NO_MAP_IN_RANGE : null;
        return new MapBrowseResponse(cards, result.totalCount(), empty, result.page(), result.hasNext(), areas);
    }

    /** 지도마다 스팟 가운데 위치에서 가장 가까운 동네(AREA 태그 id) */
    private Map<Long, Long> areaOfMaps(List<SecretMap> maps, TagIndex tags) {
        Map<Long, Long> out = new HashMap<>();
        for (Object[] row : queries.centerOfMaps(maps.stream().map(SecretMap::getId).toList())) {
            if (row[1] == null || row[2] == null) continue;
            String name = MapArea.nearest(((Number) row[1]).doubleValue(), ((Number) row[2]).doubleValue());
            Long areaId = tags.areaIdByName(name);
            if (areaId != null) out.put((Long) row[0], areaId);
        }
        return out;
    }

    /** 동네별 지도 수 (동네 조건을 빼고 핀 개수 조건만 적용한 목록 기준) */
    private static List<AreaCount> areaCounts(TagIndex tags, List<Candidate> candidates, String lang) {
        Map<Long, Long> count = candidates.stream().filter(c -> c.areaTagId() != null)
                .collect(Collectors.groupingBy(Candidate::areaTagId, Collectors.counting()));
        return tags.areaTags().stream()
                .map(t -> new AreaCount(t.getId(), t.nameIn(lang), count.getOrDefault(t.getId(), 0L)))
                .toList();
    }

    /**
     * 취향 태그 한 번에 읽어 둔 것. 추천 점수 규칙(디자인 11/26):
     * 동네(AREA)는 점수에 넣지 않고, 3단계 세부·멤버는 2단계 항목으로 묶어서 같은 취향으로 본다.
     */
    private record TagIndex(Map<Long, Tag> byId, List<Tag> areaTags, Map<String, Long> areaIdByKo) {

        static TagIndex of(List<Tag> all) {
            Map<Long, Tag> byId = all.stream().collect(Collectors.toMap(Tag::getId, Function.identity()));
            List<Tag> areaTags = all.stream()
                    .filter(t -> "AREA".equals(t.getCategory()) && t.getDepth() == 2)
                    .sorted(java.util.Comparator.comparing(Tag::getId))
                    .toList();
            Map<String, Long> byKo = new LinkedHashMap<>();
            areaTags.forEach(t -> byKo.put(t.getNameKo(), t.getId()));
            return new TagIndex(byId, areaTags, byKo);
        }

        boolean isArea(Long id) {
            Tag t = byId.get(id);
            return t != null && "AREA".equals(t.getCategory()) && t.getDepth() == 2;
        }

        Long areaIdByName(String nameKo) {
            return nameKo == null ? null : areaIdByKo.get(nameKo);
        }

        /** 동네를 뺀 취향을 2단계 항목 id 로 묶는다 */
        Set<Long> tasteKeys(Set<Long> tagIds) {
            Set<Long> out = new HashSet<>();
            for (Long id : tagIds) {
                Tag t = byId.get(id);
                if (t == null) {                       // 태그 표에 없는 id 는 그대로 취향으로 센다
                    out.add(id);
                    continue;
                }
                if ("AREA".equals(t.getCategory())) continue;
                out.add(t.getDepth() >= 3 && t.getParentId() != null ? t.getParentId() : t.getId());
            }
            return out;
        }

        Set<Long> areas(Set<Long> tagIds) {
            return tagIds.stream().filter(this::isArea).collect(Collectors.toSet());
        }

        AreaView areaView(Long areaId, String lang) {
            Tag t = areaId == null ? null : byId.get(areaId);
            return t == null ? null : new AreaView(t.getId(), t.nameIn(lang));
        }
    }

    /** MAP-08 공개 스팟 미리보기 (매칭 전) */
    @Transactional(readOnly = true)
    public MapPreview preview(UUID travelerId, Long mapId) {
        LocalDate today = LocalDate.now(clock);
        TravelerContext ctx = traveler(travelerId, today);
        SecretMap map = mapRepository.findById(mapId).orElseThrow(() -> new ApiException(ErrorCode.MAP_NOT_FOUND));
        User mate = userRepository.findById(map.getMateId()).orElse(null);

        Long myMatchId = selectability.activeMatchOn(travelerId, mapId).map(Match::getId).orElse(null);
        if (myMatchId == null && (!mapVisibility.isPublic(mapId)
                || !selectability.mateListable(ctx.traveler(), ctx.pref(), mate))) {
            throw new ApiException(ErrorCode.MAP_NOT_AVAILABLE);
        }

        long spotCount = spotRepository.countByMapId(mapId);
        List<PreviewSpot> previews = spotRepository.findByMapIdAndPreviewTrueOrderBySortOrderAscIdAsc(mapId).stream()
                .map(MapBrowseService::previewSpot)
                .toList();
        Slots slots = new Slots(ctx.traveler().getMatchSlots(),
                matchRepository.countByTravelerIdAndStatusIn(travelerId, MatchStatus.ACTIVE));
        return new MapPreview(map.getId(), title(map),
                LocalizedText.of(map.getCaption(), map.getCaptionTranslated(), MAP_LANG),
                mate == null ? null : UserSummary.of(mate, today),
                spotCount, spotCount - previews.size(), Times.kst(map.getUpdatedAt()),
                previews, myMatchId, slots);
    }

    // ---------- 내부 ----------

    private record TravelerContext(User traveler, MatchPreference pref) {
    }

    /** 여행자 확인: 인증, 진행 중인 여행 일정, 매칭 조건 (MAP-07·08 공통) */
    private TravelerContext traveler(UUID travelerId, LocalDate today) {
        User traveler = userRepository.findById(travelerId)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_REGISTERED));
        if (!traveler.isVerified()) throw new ApiException(ErrorCode.NOT_VERIFIED);
        tripRepository.findFirstByTravelerIdAndEndDateGreaterThanEqualOrderByIdDesc(travelerId, today)
                .orElseThrow(() -> new ApiException(ErrorCode.TRIP_REQUIRED));
        MatchPreference pref = preferenceRepository.findById(travelerId)
                .orElseThrow(() -> new ApiException(ErrorCode.PREFERENCES_REQUIRED));
        return new TravelerContext(traveler, pref);
    }

    private Map<Long, Long> myMatchesByMap(UUID travelerId) {
        Map<Long, Long> byMap = new HashMap<>();
        for (Match m : queries.findTravelerMatches(travelerId, MatchStatus.ACTIVE)) {
            if (m.getCourseMapId() != null) byMap.put(m.getCourseMapId(), m.getId());
        }
        return byMap;
    }

    /** 지도별 [스팟 수, 공개 스팟 수] */
    private Map<Long, long[]> spotStats(List<Long> mapIds) {
        Map<Long, long[]> stats = new HashMap<>();
        if (mapIds.isEmpty()) return stats;
        for (Object[] row : queries.countSpotsByMap(mapIds)) {
            stats.put((Long) row[0], new long[]{((Number) row[1]).longValue(), ((Number) row[2]).longValue()});
        }
        return stats;
    }

    private boolean isPublic(long[] stat) {
        return stat != null && mapVisibility.isPublic(stat[0], stat[1]);
    }

    private static <K> Map<K, Long> toLongMap(List<Object[]> rows) {
        Map<K, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            @SuppressWarnings("unchecked") K key = (K) row[0];
            map.put(key, ((Number) row[1]).longValue());
        }
        return map;
    }

    /** 지도 제목 (여행자에게는 일본어 번역과 함께) */
    private static LocalizedText title(SecretMap m) {
        return LocalizedText.of(m.getTitle(), m.getTitleTranslated(), MAP_LANG);
    }

    private static PreviewSpot previewSpot(Spot s) {
        return new PreviewSpot(s.getId(), s.getName(), s.getAddress(), s.getLat(), s.getLng(), s.photoUrls(),
                LocalizedText.of(s.getReason(), s.getReasonTranslated(), MAP_LANG),
                LocalizedText.of(s.getReview(), s.getReviewTranslated(), MAP_LANG));
    }

    // ---------- 응답 ----------

    /** 빈 목록일 때 화면 구분: NO_MATE → T-18, NO_MAP_IN_RANGE → T-11 빈 화면 */
    public enum EmptyReason { NO_MATE, NO_MAP_IN_RANGE }

    /** 지도의 동네 (카드 맨 앞 동네 이름). 이름은 보는 사람 언어 */
    public record AreaView(Long tagId, String name) {
    }

    /** 미니 지도 말풍선: 동네별 지도 수 (동네 조건은 빼고 센다, 0이어도 6곳 모두) */
    public record AreaCount(Long tagId, String name, long mapCount) {
    }

    public record MapCard(Long mapId, LocalizedText title, UserSummary mate, long pinCount,
                          OffsetDateTime lastUpdatedAt, long selectedCount, Long myMatchId, AreaView area) {
    }

    public record MapBrowseResponse(List<MapCard> items, long totalCount, EmptyReason emptyReason,
                                    int page, boolean hasNext, List<AreaCount> areas) {
    }

    public record PreviewSpot(Long spotId, String name, String address, BigDecimal lat, BigDecimal lng,
                              List<String> photos, LocalizedText reason, LocalizedText review) {
    }

    public record Slots(int total, long used) {
    }

    public record MapPreview(Long mapId, LocalizedText title, LocalizedText caption, UserSummary mate,
                             long spotCount, long hiddenSpotCount, OffsetDateTime lastUpdatedAt,
                             List<PreviewSpot> previewSpots, Long myMatchId, Slots slots) {
    }
}
