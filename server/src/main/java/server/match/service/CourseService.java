package server.match.service;

import server.global.common.LocalizedText;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.map.service.MapVisibility;
import server.match.domain.Match;
import server.visit.domain.SpotVisit;
import server.visit.repository.SpotVisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** 티켓 5: 메이트 지도 목록(공개 필드 제한), 코스 선택, 코스 지도 */
@Service
@RequiredArgsConstructor
public class CourseService {

    /** 지도·스팟 글은 메이트(한국어)가 쓴다 */
    private static final String MAP_LANG = "ko";

    private final MatchAccess matchAccess;
    private final MatchViewAssembler views;
    private final SecretMapRepository mapRepository;
    private final SpotRepository spotRepository;
    private final SpotVisitRepository visitRepository;
    private final MapVisibility mapVisibility;
    private final PolicyProperties policy;
    private final Clock clock;

    /**
     * MATCH-04 메이트 지도 목록.
     * 공개 스팟 2곳 외 스팟은 개수만 준다. 앱에서 숨기는 게 아니라 서버가 아예 보내지 않는다.
     */
    @Transactional(readOnly = true)
    public List<MatchDtos.MateMap> mateMaps(AuthUser me, Long matchId) {
        Match m = matchAccess.travelerMember(matchId, me, false);
        if (!m.getStatus().isActive()) throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        return mapRepository.findByMateIdOrderByIdAsc(m.getMateId()).stream()
                .filter(map -> mapVisibility.isPublic(map.getId()))
                .map(map -> new MatchDtos.MateMap(map.getId(), map.getTitle(), caption(map),
                        spotRepository.countByMapId(map.getId()),
                        spotRepository.findByMapIdAndPreviewTrueOrderBySortOrderAscIdAsc(map.getId()).stream()
                                .map(this::spotView).toList()))
                .toList();
    }

    /** MATCH-05 코스 지도 선택 → 여행 시작. required_visits 를 이때 계산해 저장 */
    @Transactional
    public MatchDtos.CourseSelected selectCourse(AuthUser me, Long matchId, Long mapId) {
        Match m = matchAccess.travelerMember(matchId, me, true);
        SecretMap map = mapRepository.findById(mapId)
                .filter(x -> x.getMateId().equals(m.getMateId()))
                .orElseThrow(() -> new ApiException(ErrorCode.MAP_NOT_AVAILABLE));
        if (!mapVisibility.isPublic(map.getId())) throw new ApiException(ErrorCode.MAP_NOT_AVAILABLE);

        int spotCount = (int) spotRepository.countByMapId(map.getId());
        m.selectCourse(map.getId(), policy.requiredVisits(spotCount), LocalDateTime.now(clock));
        return new MatchDtos.CourseSelected(m.getId(), m.getStatus().name(), m.getCourseMapId(),
                new MatchDtos.Progress(0, m.getRequiredVisits(), spotCount));
    }

    /** MATCH-06 코스 지도 (스팟 전체 + 스탬프) */
    @Transactional(readOnly = true)
    public MatchDtos.CourseView course(AuthUser me, Long matchId) {
        Match m = matchAccess.member(matchId, me);
        if (m.getCourseMapId() == null) throw new ApiException(ErrorCode.COURSE_NOT_SELECTED);
        SecretMap map = mapRepository.findById(m.getCourseMapId()).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        Map<Long, SpotVisit> visits = visitRepository.findByMatchId(m.getId()).stream()
                .collect(Collectors.toMap(SpotVisit::getSpotId, Function.identity(), (x, y) -> x));
        List<MatchDtos.CourseSpot> spots = spotRepository.findByMapIdOrderBySortOrderAscIdAsc(map.getId()).stream()
                .map(s -> {
                    SpotVisit v = visits.get(s.getId());
                    return new MatchDtos.CourseSpot(s.getId(), s.getName(), s.getAddress(), s.getLat(), s.getLng(),
                            s.photoUrls(), text(s.getReason(), s.getReasonTranslated()),
                            text(s.getReview(), s.getReviewTranslated()), v != null, v == null ? null : v.getId());
                }).toList();
        return new MatchDtos.CourseView(new MatchDtos.MapHeader(map.getId(), map.getTitle(), caption(map)),
                views.progress(m), spots);
    }

    private MatchDtos.SpotView spotView(Spot s) {
        return new MatchDtos.SpotView(s.getId(), s.getName(), s.getAddress(), s.getLat(), s.getLng(), s.photoUrls(),
                text(s.getReason(), s.getReasonTranslated()), text(s.getReview(), s.getReviewTranslated()));
    }

    private LocalizedText caption(SecretMap map) {
        return text(map.getCaption(), map.getCaptionTranslated());
    }

    private LocalizedText text(String original, String translated) {
        return LocalizedText.of(original, translated, MAP_LANG);
    }
}
