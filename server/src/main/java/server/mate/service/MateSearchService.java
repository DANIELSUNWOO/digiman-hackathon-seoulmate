package server.mate.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.global.common.Times;
import server.global.common.UserSummary;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.map.domain.SecretMap;
import server.map.repository.SpotRepository;
import server.map.service.MapVisibility;
import server.match.service.MateEligibility;
import server.mate.repository.MateSearchQueries;
import server.mate.service.MateRanking.Candidate;
import server.mate.service.MateRanking.MapStat;
import server.mate.service.MateRanking.Ranked;
import server.tag.domain.Tag;
import server.tag.domain.UserTag;
import server.tag.repository.TagRepository;
import server.tag.repository.UserTagRepository;
import server.tag.service.TagService.TagView;
import server.trip.repository.TripRepository;
import server.user.domain.MatchPreference;
import server.user.domain.Role;
import server.user.domain.User;
import server.user.domain.UserStatus;
import server.user.repository.MatchPreferenceRepository;
import server.user.repository.UserRepository;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * MATE-01 메이트 찾기 (F-15, F-16).
 * 1) 목록 조건은 MateEligibility 로 MATCH-01 과 같은 기준으로 거른다
 * 2) 점수·필터·정렬·페이지는 MateRanking (순수 로직)
 * 3) 카드에는 지도 이름·캡션·스팟 내용을 넣지 않는다 (F-16)
 */
@Service
@RequiredArgsConstructor
public class MateSearchService {

    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;
    private final MatchPreferenceRepository preferenceRepository;
    private final TripRepository tripRepository;
    private final UserTagRepository userTagRepository;
    private final TagRepository tagRepository;
    private final SpotRepository spotRepository;
    private final MapVisibility mapVisibility;
    private final MateEligibility eligibility;
    private final MateSearchQueries queries;
    private final PolicyProperties policy;
    private final Clock clock;

    @Transactional(readOnly = true)
    public MateListResponse search(UUID travelerId, String sortParam, Integer minPins, Integer maxPins,
                                   Integer page, Integer size) {
        MateSort sort = MateSort.from(sortParam);
        MateRanking.validatePinRange(minPins, maxPins, policy.mapMinSpots());
        int pageNo = page == null ? 0 : page;
        int pageSize = size == null ? policy.mateListPageSize() : Math.min(size, MAX_PAGE_SIZE);

        LocalDate today = LocalDate.now(clock);
        User traveler = userRepository.findById(travelerId)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_REGISTERED));
        if (!traveler.isVerified()) throw new ApiException(ErrorCode.NOT_VERIFIED);
        tripRepository.findFirstByTravelerIdAndEndDateGreaterThanEqualOrderByIdDesc(travelerId, today)
                .orElseThrow(() -> new ApiException(ErrorCode.TRIP_REQUIRED));
        MatchPreference pref = preferenceRepository.findById(travelerId)
                .orElseThrow(() -> new ApiException(ErrorCode.PREFERENCES_REQUIRED));

        // 1) 목록 조건 통과한 메이트
        List<User> mates = queries.findByRoleAndStatus(Role.MATE, UserStatus.ACTIVE).stream()
                .filter(m -> eligibility.isListable(traveler, pref, m))
                .toList();
        if (mates.isEmpty()) {
            return new MateListResponse(List.of(), pageNo, false);
        }
        List<UUID> mateIds = mates.stream().map(User::getId).toList();

        // 2) 후보별 취향·공개 지도·선택 횟수
        Map<UUID, Set<Long>> tagsByMate = queries.findTagsOf(mateIds).stream()
                .collect(Collectors.groupingBy(UserTag::getUserId,
                        Collectors.mapping(UserTag::getTagId, Collectors.toSet())));

        Map<UUID, List<MapStat>> mapsByMate = new HashMap<>();
        for (SecretMap map : queries.findMapsOf(mateIds)) {
            long spots = spotRepository.countByMapId(map.getId());
            long previews = spotRepository.countByMapIdAndPreviewTrue(map.getId());
            if (mapVisibility.isPublic(spots, previews)) {
                mapsByMate.computeIfAbsent(map.getMateId(), k -> new ArrayList<>())
                        .add(new MapStat(spots, map.getUpdatedAt()));
            }
        }

        Map<UUID, Long> selectedByMate = new HashMap<>();
        for (Object[] row : queries.countSelectedByMate(mateIds)) {
            selectedByMate.put((UUID) row[0], ((Number) row[1]).longValue());
        }

        List<Candidate> candidates = mateIds.stream()
                .map(id -> new Candidate(id, tagsByMate.getOrDefault(id, Set.of()),
                        mapsByMate.getOrDefault(id, List.of()), selectedByMate.getOrDefault(id, 0L)))
                .toList();

        // 3) 점수·필터·정렬·페이지
        Set<Long> travelerTags = userTagRepository.findByUserId(travelerId).stream()
                .map(UserTag::getTagId).collect(Collectors.toSet());
        List<Ranked> ranked = MateRanking.rank(travelerTags, candidates, sort, minPins, maxPins);
        MateRanking.Page result = MateRanking.page(ranked, pageNo, pageSize);

        // 4) 카드 만들기 (취향 이름은 여행자 언어로)
        Set<Long> commonIds = new HashSet<>();
        result.items().forEach(r -> commonIds.addAll(r.commonTagIds()));
        Map<Long, Tag> tagById = tagRepository.findAllById(commonIds).stream()
                .collect(Collectors.toMap(Tag::getId, Function.identity()));
        Map<UUID, User> mateById = mates.stream().collect(Collectors.toMap(User::getId, Function.identity()));
        String lang = traveler.getLanguage();

        List<MateCard> cards = result.items().stream()
                .map(r -> new MateCard(
                        UserSummary.of(mateById.get(r.mateId()), today),
                        r.commonTagCount(),
                        r.commonTagIds().stream().sorted()
                                .map(tagById::get).filter(t -> t != null)
                                .map(t -> TagView.of(t, lang)).toList(),
                        r.pinCount(),
                        r.lastUpdatedAt() == null ? null : Times.kst(r.lastUpdatedAt()),
                        r.selectedCount(),
                        null))   // matchReason: 선택 기능(F-OPT-02)
                .toList();
        return new MateListResponse(cards, result.page(), result.hasNext());
    }

    public record MateCard(UserSummary mate, int commonTagCount, List<TagView> commonTags, long pinCount,
                           OffsetDateTime lastUpdatedAt, long selectedCount, String matchReason) {
    }

    public record MateListResponse(List<MateCard> items, int page, boolean hasNext) {
    }
}
