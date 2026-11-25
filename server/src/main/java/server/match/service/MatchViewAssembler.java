package server.match.service;

import java.util.UUID;

import server.album.repository.AlbumRepository;
import server.global.common.Times;
import server.global.common.UserSummary;
import server.map.domain.SecretMap;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
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
    private final SpotRepository spotRepository;
    private final SpotVisitRepository visitRepository;
    private final AlbumRepository albumRepository;
    private final MatchRepository matchRepository;
    private final Clock clock;

    public MatchDtos.MatchItem item(Match m, UUID viewerId) {
        LocalDate today = LocalDate.now(clock);
        User partner = userRepository.findById(m.partnerOf(viewerId)).orElseThrow();
        MatchDtos.CourseMap courseMap = null;
        MatchDtos.Progress progress = null;
        if (m.getCourseMapId() != null) {
            SecretMap map = mapRepository.findById(m.getCourseMapId()).orElse(null);
            if (map != null) courseMap = new MatchDtos.CourseMap(map.getId(), map.getTitle());
            progress = progress(m);
        }
        MatchDtos.TripRange trip = tripRepository.findById(m.getTripId())
                .map(t -> new MatchDtos.TripRange(t.getStartDate(), t.getEndDate())).orElse(null);
        var lastVisit = visitRepository.findFirstByMatchIdOrderByVerifiedAtDesc(m.getId())
                .map(SpotVisit::getVerifiedAt).orElse(null);
        return new MatchDtos.MatchItem(m.getId(), m.getStatus().name(), m.getChatStatus().name(),
                UserSummary.of(partner, today), courseMap, progress, trip, Times.kst(lastVisit));
    }

    public MatchDtos.MatchDetail detail(Match m, UUID viewerId) {
        MatchDtos.MatchItem i = item(m, viewerId);
        Boolean partnerAnswer = m.chatAnswerOf(m.partnerOf(viewerId));
        // 상대가 거절했는지는 알려 주지 않는다 (수락했는지만 true/false)
        MatchDtos.Chat chat = new MatchDtos.Chat(m.getChatStatus().name(), m.chatAnswerOf(viewerId),
                Boolean.TRUE.equals(partnerAnswer));
        Long albumId = albumRepository.findByMatchId(m.getId()).map(a -> a.getId()).orElse(null);
        return new MatchDtos.MatchDetail(i.matchId(), i.status(), i.chatStatus(), i.partner(), i.courseMap(),
                i.progress(), i.trip(), i.lastVisitAt(), chat, Times.kst(m.getMatchedAt()),
                Times.kst(m.getCourseSelectedAt()), Times.kst(m.getEndedAt()), albumId);
    }

    public MatchDtos.Progress progress(Match m) {
        if (m.getCourseMapId() == null) return null;
        return new MatchDtos.Progress(visitRepository.countByMatchId(m.getId()), m.getRequiredVisits(),
                spotRepository.countByMapId(m.getCourseMapId()));
    }

    public MatchDtos.Slots slotsOf(User traveler) {
        return new MatchDtos.Slots(traveler.getMatchSlots(),
                matchRepository.countByTravelerIdAndStatusIn(traveler.getId(), MatchStatus.ACTIVE));
    }
}
