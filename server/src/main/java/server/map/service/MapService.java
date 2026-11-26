package server.map.service;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.global.common.LocalizedText;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.event.TranslationTarget;
import server.global.security.AuthUser;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.MapBrowseQueries;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.tag.repository.TagRepository;
import server.translation.TranslationService;
import server.user.domain.User;
import server.user.repository.UserRepository;
import server.visit.repository.SpotVisitRepository;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * [서버 B] 비밀지도·스팟 (MAP-01~06, SPOT-01~03, F-10~F-14).
 * - 메이트가 쓴 글(캡션·추천 이유·후기)은 한국어 원문으로 저장하고 일본어 번역을 비동기로 채운다
 * - 지도나 스팟이 바뀌면 지도의 updated_at 을 갱신한다 ("최근 업데이트 순" 정렬)
 * - 한 번이라도 코스로 쓰였거나 방문 기록이 있는 지도는 삭제 불가 (409 MAP_IN_USE)
 * - 지도 수정 잠금 (v1.7): 여행 중인 여행자가 있으면 기존 스팟·지도 이름·공개 스팟 지정 불가(MAP_LOCKED), 새 스팟 추가만 허용.
 *   여행자가 없어도 공개 스팟은 수정·삭제 불가(PREVIEW_SPOT_LOCKED) → 다른 곳을 공개로 바꾼 뒤 수정
 */
@Service
@RequiredArgsConstructor
public class MapService {

    static final String MAP_LANG = "ko";
    static final String READER_LANG = "ja";
    private static final int MAX_PHOTOS = 3;   // 화면 명세 v9 M-13 "사진 최대 3장"
    private static final int MAX_URL_LENGTH = 500;

    private final SecretMapRepository mapRepository;
    private final SpotRepository spotRepository;
    private final SpotVisitRepository visitRepository;
    private final MatchRepository matchRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final MapVisibility mapVisibility;
    private final PolicyProperties policy;
    private final TranslationService translationService;
    private final MapBrowseQueries browseQueries;
    private final Clock clock;

    // ---------- 지도 ----------

    /** MAP-01 지도 만들기 (메이트, 인증 필요) */
    @Transactional
    public MapCreated createMap(AuthUser me, MapRequest req) {
        User mate = userRepository.findById(me.id()).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_REGISTERED));
        if (!mate.isVerified()) throw new ApiException(ErrorCode.NOT_VERIFIED);
        SecretMap map = mapRepository.save(SecretMap.of(me.id(), req.title().trim(), blankToNull(req.caption()), now()));
        translate(TranslationTarget.MAP_TITLE, map.getId(), map.getTitle());
        translate(TranslationTarget.MAP_CAPTION, map.getId(), map.getCaption());
        return new MapCreated(map.getId());
    }

    /** MAP-02 내 지도 목록 */
    @Transactional(readOnly = true)
    public List<MyMap> myMaps(AuthUser me) {
        List<SecretMap> maps = mapRepository.findByMateIdOrderByIdAsc(me.id());
        if (maps.isEmpty()) return List.of();
        List<Long> mapIds = maps.stream().map(SecretMap::getId).toList();
        Map<Long, Long> selected = countByMap(browseQueries.countMatchesByMap(mapIds, EnumSet.allOf(MatchStatus.class)));
        Map<Long, Long> traveling = countByMap(browseQueries.countMatchesByMap(mapIds, MatchStatus.ACTIVE));
        return maps.stream().map(m -> {
            long spots = spotRepository.countByMapId(m.getId());
            long previews = spotRepository.countByMapIdAndPreviewTrue(m.getId());
            long travelingCount = traveling.getOrDefault(m.getId(), 0L);
            return new MyMap(m.getId(), m.getTitle(), caption(m), spots, previews,
                    mapVisibility.isPublic(spots, previews), travelingCount > 0,
                    selected.getOrDefault(m.getId(), 0L), travelingCount);
        }).toList();
    }

    /** MAP-03 내 지도 상세 (스팟 전체) */
    @Transactional(readOnly = true)
    public MapDetail detail(AuthUser me, Long mapId) {
        SecretMap m = ownedMap(me, mapId);
        List<SpotView> spots = spotRepository.findByMapIdOrderBySortOrderAscIdAsc(mapId).stream().map(MapService::view).toList();
        long previews = spots.stream().filter(SpotView::isPreview).count();
        return new MapDetail(m.getId(), m.getTitle(), caption(m), mapVisibility.isPublic(spots.size(), previews), spots);
    }

    /** MAP-04 지도 이름·캡션 수정 */
    @Transactional
    public MapDetail editMap(AuthUser me, Long mapId, MapPatch req) {
        SecretMap m = ownedMapForUpdate(me, mapId);   // 캡션 번역 저장과 차례로 처리
        requireNotTraveling(mapId);
        String title = req.title() == null ? null : req.title().trim();
        if (title != null && title.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        boolean titleChanged = title != null && !title.equals(m.getTitle());
        m.edit(title, req.caption());
        m.touch(now());
        if (titleChanged) translate(TranslationTarget.MAP_TITLE, m.getId(), m.getTitle());
        if (req.caption() != null) translate(TranslationTarget.MAP_CAPTION, m.getId(), m.getCaption());
        return detail(me, mapId);
    }

    /** MAP-05 지도 삭제 */
    @Transactional
    public void deleteMap(AuthUser me, Long mapId) {
        SecretMap m = ownedMap(me, mapId);
        List<Spot> spots = spotRepository.findByMapIdOrderBySortOrderAscIdAsc(mapId);
        List<Long> spotIds = spots.stream().map(Spot::getId).toList();
        if (usedByAnyMatch(mapId) || (!spotIds.isEmpty() && visitRepository.existsBySpotIdIn(spotIds))) {
            throw new ApiException(ErrorCode.MAP_IN_USE);
        }
        spotRepository.deleteAll(spots);       // 사진은 Spot 에서 함께 지워진다 (cascade)
        mapRepository.delete(m);
    }

    /** MAP-06 공개 스팟 2곳 지정. 기존 공개 스팟은 해제되고 이 2곳으로 바뀐다 */
    @Transactional
    public PreviewResult setPreviews(AuthUser me, Long mapId, List<Long> spotIds) {
        SecretMap m = ownedMap(me, mapId);
        requireNotTraveling(mapId);
        Set<Long> chosen = new LinkedHashSet<>(spotIds == null ? List.of() : spotIds);
        if (chosen.size() != policy.mapPreviewSpots()) throw new ApiException(ErrorCode.PREVIEW_COUNT_INVALID);

        List<Spot> spots = spotRepository.findByMapIdOrderBySortOrderAscIdAsc(mapId);
        Set<Long> inMap = new LinkedHashSet<>(spots.stream().map(Spot::getId).toList());
        if (!inMap.containsAll(chosen)) throw new ApiException(ErrorCode.SPOT_NOT_IN_MAP);

        spots.forEach(s -> s.setPreview(chosen.contains(s.getId())));
        m.touch(now());
        return new PreviewResult(mapId, List.copyOf(chosen), mapVisibility.isPublic(spots.size(), chosen.size()));
    }

    // ---------- 스팟 ----------

    /** SPOT-01 스팟 등록 */
    @Transactional
    public SpotCreated addSpot(AuthUser me, Long mapId, SpotRequest req) {
        SecretMap m = ownedMap(me, mapId);
        List<String> photos = photos(req.photoUrls());
        if (photos.isEmpty()) throw new ApiException(ErrorCode.PHOTO_REQUIRED);
        checkTag(req.tagId());

        int order = (int) spotRepository.countByMapId(mapId);
        Spot s = Spot.of(mapId, req.name().trim(), blankToNull(req.address()), req.lat(), req.lng(), req.tagId(),
                blankToNull(req.reason()), blankToNull(req.review()), order);
        photos.forEach(s::addPhoto);
        spotRepository.save(s);
        m.touch(now());

        translate(TranslationTarget.SPOT_REASON, s.getId(), s.getReason());
        translate(TranslationTarget.SPOT_REVIEW, s.getId(), s.getReview());

        long spots = order + 1L;
        long previews = spotRepository.countByMapIdAndPreviewTrue(mapId);
        return new SpotCreated(s.getId(), spots, mapVisibility.isPublic(spots, previews));
    }

    /** SPOT-02 스팟 수정 (보낸 값만) */
    @Transactional
    public SpotView editSpot(AuthUser me, Long spotId, SpotPatch req) {
        Spot s = ownedSpotForUpdate(me, spotId);       // 추천 이유·후기 번역 저장과 차례로 처리
        requireEditableSpot(s);
        checkTag(req.tagId());
        String name = trimOrNull(req.name());
        if (name != null && name.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR);   // 공백만 보낸 이름
        s.edit(name, req.address(), req.lat(), req.lng(), req.tagId(), req.reason(), req.review());
        if (req.photoUrls() != null) {
            List<String> photos = photos(req.photoUrls());
            if (photos.isEmpty()) throw new ApiException(ErrorCode.PHOTO_REQUIRED);
            s.replacePhotos(photos);
        }
        mapRepository.findById(s.getMapId()).ifPresent(m -> m.touch(now()));
        if (req.reason() != null) translate(TranslationTarget.SPOT_REASON, s.getId(), s.getReason());
        if (req.review() != null) translate(TranslationTarget.SPOT_REVIEW, s.getId(), s.getReview());
        return view(s);
    }

    /** SPOT-03 스팟 삭제. 공개 스팟은 지울 수 없다 (다른 곳을 공개로 바꾼 뒤 삭제) */
    @Transactional
    public void deleteSpot(AuthUser me, Long spotId) {
        Spot s = ownedSpot(me, spotId);
        requireEditableSpot(s);
        if (visitRepository.existsBySpotId(spotId)) throw new ApiException(ErrorCode.MAP_IN_USE);   // 방문 기록 보존
        spotRepository.delete(s);
        mapRepository.findById(s.getMapId()).ifPresent(m -> m.touch(now()));
    }

    // ---------- 내부 ----------

    private SecretMap ownedMap(AuthUser me, Long mapId) {
        SecretMap m = mapRepository.findById(mapId).orElseThrow(() -> new ApiException(ErrorCode.MAP_NOT_FOUND));
        if (!m.getMateId().equals(me.id())) throw new ApiException(ErrorCode.NOT_MAP_OWNER);
        return m;
    }

    private SecretMap ownedMapForUpdate(AuthUser me, Long mapId) {
        SecretMap m = mapRepository.findByIdForUpdate(mapId).orElseThrow(() -> new ApiException(ErrorCode.MAP_NOT_FOUND));
        if (!m.getMateId().equals(me.id())) throw new ApiException(ErrorCode.NOT_MAP_OWNER);
        return m;
    }

    private Spot ownedSpotForUpdate(AuthUser me, Long spotId) {
        Spot s = spotRepository.findByIdForUpdate(spotId).orElseThrow(() -> new ApiException(ErrorCode.SPOT_NOT_FOUND));
        ownedMap(me, s.getMapId());
        return s;
    }

    private Spot ownedSpot(AuthUser me, Long spotId) {
        Spot s = spotRepository.findById(spotId).orElseThrow(() -> new ApiException(ErrorCode.SPOT_NOT_FOUND));
        ownedMap(me, s.getMapId());
        return s;
    }

    private boolean inUse(Long mapId) {
        return matchRepository.existsByCourseMapIdAndStatusIn(mapId, MatchStatus.ACTIVE);
    }

    /**
     * 지도 수정 잠금 (API v1.7, 화면 명세 v9 M-10a):
     * 여행 중인 여행자가 있으면 기존 스팟·지도 이름·공개 스팟 지정을 바꿀 수 없다 (새 스팟 추가만 허용).
     */
    private void requireNotTraveling(Long mapId) {
        if (inUse(mapId)) throw new ApiException(ErrorCode.MAP_LOCKED);
    }

    /** 스팟 수정·삭제: 여행 중이면 MAP_LOCKED, 공개 스팟이면 PREVIEW_SPOT_LOCKED (다른 곳을 공개로 바꾼 뒤 수정) */
    private void requireEditableSpot(Spot s) {
        requireNotTraveling(s.getMapId());
        if (s.isPreview()) throw new ApiException(ErrorCode.PREVIEW_SPOT_LOCKED);
    }

    private static Map<Long, Long> countByMap(List<Object[]> rows) {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : rows) map.put((Long) row[0], ((Number) row[1]).longValue());
        return map;
    }

    /** 끝난 매칭(취소·만료 포함)도 matches.course_map_id 로 지도를 참조하므로, 한 번이라도 코스로 쓰인 지도는 지우지 않는다 */
    private boolean usedByAnyMatch(Long mapId) {
        return matchRepository.existsByCourseMapIdAndStatusIn(mapId, EnumSet.allOf(MatchStatus.class));
    }

    private void checkTag(Long tagId) {
        if (tagId != null && !tagRepository.existsById(tagId)) throw new ApiException(ErrorCode.INVALID_TAG);
    }

    private static List<String> photos(List<String> urls) {
        List<String> clean = urls == null ? List.of()
                : urls.stream().filter(u -> u != null && !u.isBlank()).map(String::trim).toList();
        if (clean.size() > MAX_PHOTOS || clean.stream().anyMatch(u -> u.length() > MAX_URL_LENGTH)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);   // DB 칸(500자)보다 길면 저장 전에 400
        }
        return clean;
    }

    private void translate(TranslationTarget target, Long id, String text) {
        if (text != null && !text.isBlank()) translationService.translateAsync(target, id, text, MAP_LANG, READER_LANG);
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }

    private static LocalizedText caption(SecretMap m) {
        return LocalizedText.of(m.getCaption(), m.getCaptionTranslated(), MAP_LANG);
    }

    static SpotView view(Spot s) {
        return new SpotView(s.getId(), s.getName(), s.getAddress(), s.getLat(), s.getLng(), s.getTagId(), s.photoUrls(),
                LocalizedText.of(s.getReason(), s.getReasonTranslated(), MAP_LANG),
                LocalizedText.of(s.getReview(), s.getReviewTranslated(), MAP_LANG),
                s.isPreview(), s.getSortOrder());
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static String trimOrNull(String v) {
        return v == null ? null : v.trim();
    }

    // ---------- 요청·응답 ----------

    public record MapRequest(@NotBlank @Size(max = 30) String title, @Size(max = 300) String caption) {}

    public record MapPatch(@Size(max = 30) String title, @Size(max = 300) String caption) {}

    public record PreviewRequest(@NotNull List<Long> spotIds) {}

    public record SpotRequest(@NotBlank @Size(max = 100) String name,
                              @Size(max = 200) String address,
                              @NotNull @DecimalMin("-90") @DecimalMax("90") BigDecimal lat,
                              @NotNull @DecimalMin("-180") @DecimalMax("180") BigDecimal lng,
                              Long tagId,
                              List<String> photoUrls,
                              @Size(max = 500) String reason,
                              @Size(max = 500) String review) {}

    public record SpotPatch(@Size(min = 1, max = 100) String name,
                            @Size(max = 200) String address,
                            @DecimalMin("-90") @DecimalMax("90") BigDecimal lat,
                            @DecimalMin("-180") @DecimalMax("180") BigDecimal lng,
                            Long tagId,
                            List<String> photoUrls,
                            @Size(max = 500) String reason,
                            @Size(max = 500) String review) {}

    public record MapCreated(Long mapId) {}

    public record MyMap(Long mapId, String title, LocalizedText caption, long spotCount, long previewCount,
                        boolean isPublic, boolean inUse, long selectedCount, long travelingCount) {}

    public record MapDetail(Long mapId, String title, LocalizedText caption, boolean isPublic, List<SpotView> spots) {}

    public record SpotView(Long spotId, String name, String address, BigDecimal lat, BigDecimal lng, Long tagId,
                           List<String> photos, LocalizedText reason, LocalizedText review,
                           boolean isPreview, int sortOrder) {}

    public record PreviewResult(Long mapId, List<Long> previewSpotIds, boolean isPublic) {}

    public record SpotCreated(Long spotId, long spotCount, boolean isPublic) {}
}
