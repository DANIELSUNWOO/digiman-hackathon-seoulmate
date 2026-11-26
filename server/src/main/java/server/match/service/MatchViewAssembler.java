package server.match.service;

import java.util.UUID;

import server.album.repository.AlbumRepository;
import server.global.common.LocalizedText;
import server.global.common.Times;
import server.global.common.UserSummary;
import server.map.domain.SecretMap;
import server.map.repository.SecretMapRepository;
import server.map.service.MapQuery;
import server.visit.service.VisitQuery;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.safety.domain.Block;
import server.safety.repository.BlockRepository;
import server.trip.repository.TripRepository;
import server.user.domain.User;
import server.user.repository.UserRepository;
import server.visit.domain.SpotVisit;
import server.visit.repository.SpotVisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;

/** 매칭 → 응답 모양 변환 (진행률·상대 정보·코스 지도 이름 등 조립) */
@Component
@RequiredArgsConstructor
public class MatchViewAssembler {

    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final SecretMapRepository mapRepository;
    private final MapQuery mapQuery;
    private final VisitQuery visitQuery;
    private final SpotVisitRepository visitRepository;
    private final AlbumRepository albumRepository;
    private final MatchRepository matchRepository;
    private final BlockRepository blockRepository;
    private final Clock clock;

    public MatchDtos.MatchItem item(Match m, UUID viewerId) {
        LocalDate today = LocalDate.now(clock);
        User partner = userRepository.findById(m.partnerOf(viewerId)).orElseThrow();
        MatchDtos.CourseMap courseMap = null;
        MatchDtos.Progress progress = null;
        if (m.getCourseMapId() != null) {
            SecretMap map = mapRepository.findById(m.getCourseMapId()).orElse(null);
            if (map != null) courseMap = courseMap(map, viewerId, m);
            progress = progress(m);
        }
        MatchDtos.TripRange trip = tripRepository.findById(m.getTripId())
                .map(t -> new MatchDtos.TripRange(t.getStartDate(), t.getEndDate())).orElse(null);
        var lastVisit = visitRepository.findFirstByMatchIdOrderByVerifiedAtDesc(m.getId())
                .map(SpotVisit::getVerifiedAt).orElse(null);
        return new MatchDtos.MatchItem(m.getId(), displayStatus(m, viewerId), m.getChatStatus().name(),
                UserSummary.of(partner, today), courseMap, progress, trip, Times.kst(lastVisit));
    }

    public MatchDtos.MatchDetail detail(Match m, UUID viewerId) {
        MatchDtos.MatchItem i = item(m, viewerId);
        // API v1.7: 여행자이고 READY 면 canOpen (메이트는 항상 false)
        MatchDtos.Chat chat = new MatchDtos.Chat(m.getChatStatus().name(), m.canOpenChat(viewerId));
        Long albumId = albumRepository.findByMatchId(m.getId()).map(a -> a.getId()).orElse(null);
        return new MatchDtos.MatchDetail(i.matchId(), i.status(), i.chatStatus(), i.partner(), i.courseMap(),
                i.progress(), i.trip(), i.lastVisitAt(), chat, Times.kst(m.getMatchedAt()),
                Times.kst(m.getCourseSelectedAt()), Times.kst(m.getEndedAt()), albumId,
                blockedAgainst(m, viewerId).map(b -> !b.hasFeedback()).orElse(false));
    }

    /**
     * 코스 지도 이름: 여행자에게는 LocalizedText(원문 한국어 + 일본어 번역), 메이트에게는 한국어 문자열.
     * 번역 칼럼(secret_maps.title_translated)은 V2 마이그레이션으로 추가했고, 엔티티 매핑은 서버 B(SecretMap)가 채운다.
     */
    public MatchDtos.CourseMap courseMap(SecretMap map, UUID viewerId, Match m) {
        return new MatchDtos.CourseMap(map.getId(), title(map, viewerId, m));
    }

    public Object title(SecretMap map, UUID viewerId, Match m) {
        if (!m.isTraveler(viewerId)) return map.getTitle();
        return LocalizedText.of(map.getTitle(), null, "ko");
    }

    /** API v1.5: 차단당한 쪽에게는 BLOCKED 대신 ENDED (차단 사실을 드러내지 않음) */
    private String displayStatus(Match m, UUID viewerId) {
        if (m.getStatus() == MatchStatus.BLOCKED && blockedAgainst(m, viewerId).isPresent()) return "ENDED";
        return m.getStatus().name();
    }

    /** 이 매칭에서 viewer 가 차단당한 기록 */
    private java.util.Optional<Block> blockedAgainst(Match m, UUID viewerId) {
        return blockRepository.findFirstByMatchIdAndBlockedId(m.getId(), viewerId);
    }

    public MatchDtos.Progress progress(Match m) {
        if (m.getCourseMapId() == null) return null;
        return new MatchDtos.Progress(visitQuery.countByMatch(m.getId()), m.getRequiredVisits(),
                mapQuery.spotCount(m.getCourseMapId()));
    }

    public MatchDtos.Slots slotsOf(User traveler) {
        return new MatchDtos.Slots(traveler.getMatchSlots(),
                matchRepository.countByTravelerIdAndStatusIn(traveler.getId(), MatchStatus.ACTIVE));
    }
}
