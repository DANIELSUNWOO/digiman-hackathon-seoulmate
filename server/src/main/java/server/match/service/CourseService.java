package server.match.service;

import server.global.common.LocalizedText;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;
import server.map.domain.SecretMap;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.match.domain.Match;
import server.visit.domain.SpotVisit;
import server.visit.repository.SpotVisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 티켓 5: 코스 지도 (MATCH-06).
 * API v1.7: 메이트 지도 목록(MATCH-04)·코스 선택(MATCH-05)은 삭제. 지도 고르기는 서버 B의 MAP-07·08,
 * 매칭 + 코스 확정은 MATCH-01 이 한다.
 */
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
        return new MatchDtos.CourseView(new MatchDtos.MapHeader(map.getId(), views.title(map, me.id(), m), caption(map)),
                views.progress(m), spots);
    }

    private LocalizedText caption(SecretMap map) {
        return text(map.getCaption(), map.getCaptionTranslated());
    }

    private LocalizedText text(String original, String translated) {
        return LocalizedText.of(original, translated, MAP_LANG);
    }
}
