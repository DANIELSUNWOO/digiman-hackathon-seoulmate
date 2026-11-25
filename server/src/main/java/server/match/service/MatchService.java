package server.match.service;

import server.album.repository.AlbumRepository;
import server.global.common.Times;
import server.global.common.UserSummary;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.event.MatchCompletedEvent;
import server.global.security.AuthUser;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.notification.domain.NotificationType;
import server.notification.service.NotificationPublisher;
import server.trip.domain.Trip;
import server.trip.repository.TripRepository;
import server.user.domain.MatchPreference;
import server.user.domain.User;
import server.user.repository.MatchPreferenceRepository;
import server.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

/** 티켓 4: 매칭 신청·취소·완료, 칸, 메이트 정원 동시성, 상태머신 */
@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final TripRepository tripRepository;
    private final MatchPreferenceRepository preferenceRepository;
    private final MateEligibility mateEligibility;
    private final UserRepository userRepository;
    private final AlbumRepository albumRepository;
    private final MatchAccess matchAccess;
    private final MatchViewAssembler views;
    private final NotificationPublisher notificationPublisher;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    /**
     * MATCH-01 매칭 신청 (API v1.4: mateId 로 신청, 여행은 진행 중 일정으로 자동 지정).
     * 앱이 보낸 mateId 만 믿지 않고, 메이트 찾기 목록 조건을 서버에서 다시 확인한다.
     * 동시성: 사용자 행 2개를 항상 같은 순서(UUID 작은 쪽 먼저)로 잠근 뒤 칸·정원을 센다.
     * 두 여행자가 같은 메이트에게 동시에 신청해도 메이트 행 잠금에서 줄을 서므로 11건이 되지 않는다.
     */
    @Transactional
    public MatchDtos.ApplyResponse apply(AuthUser me, UUID mateId) {
        LocalDate today = LocalDate.now(clock);
        if (me.id().equals(mateId)) throw new ApiException(ErrorCode.MATE_NOT_AVAILABLE);

        UUID first = me.id().compareTo(mateId) < 0 ? me.id() : mateId;
        UUID second = first.equals(me.id()) ? mateId : me.id();
        User a = lockUser(first);
        User b = lockUser(second);
        if (a == null || b == null) throw new ApiException(ErrorCode.MATE_NOT_AVAILABLE);
        User traveler = a.getId().equals(me.id()) ? a : b;
        User mate = a.getId().equals(me.id()) ? b : a;

        if (!traveler.isVerified()) throw new ApiException(ErrorCode.NOT_VERIFIED);
        Trip trip = tripRepository.findFirstByTravelerIdAndEndDateGreaterThanEqualOrderByIdDesc(traveler.getId(), today)
                .orElseThrow(() -> new ApiException(ErrorCode.TRIP_REQUIRED));
        MatchPreference pref = preferenceRepository.findById(traveler.getId())
                .orElseThrow(() -> new ApiException(ErrorCode.PREFERENCES_REQUIRED));

        long used = matchRepository.countByTravelerIdAndStatusIn(traveler.getId(), MatchStatus.ACTIVE);
        if (used >= traveler.getMatchSlots()) throw new ApiException(ErrorCode.NO_FREE_SLOT);
        mateEligibility.check(traveler, pref, mate);      // MATE_NOT_AVAILABLE / ALREADY_MATCHED / MATE_FULL

        Match match = matchRepository.save(Match.create(trip.getId(), traveler.getId(), mate.getId(), LocalDateTime.now(clock)));
        notificationPublisher.publish(mate.getId(), NotificationType.MATCHED, match.getId(), traveler.getNickname());

        return new MatchDtos.ApplyResponse(match.getId(), match.getStatus().name(), match.getChatStatus().name(),
                UserSummary.of(mate, today), Times.kst(match.getMatchedAt()),
                new MatchDtos.Slots(traveler.getMatchSlots(), used + 1));
    }

    private User lockUser(UUID id) {
        return userRepository.findByIdForUpdate(id).orElse(null);
    }

    /** MATCH-02 내 매칭 목록. state = active | ended | null(전체) */
    @Transactional(readOnly = true)
    public List<MatchDtos.MatchItem> list(AuthUser me, String state) {
        Collection<MatchStatus> statuses = switch (state == null ? "" : state) {
            case "active" -> MatchStatus.ACTIVE;
            case "ended" -> MatchStatus.ENDED;
            case "" -> EnumSet.allOf(MatchStatus.class);
            default -> throw new ApiException(ErrorCode.VALIDATION_ERROR);
        };
        List<MatchDtos.MatchItem> items = matchRepository.findMine(me.id(), statuses).stream()
                .map(m -> views.item(m, me.id())).toList();
        if (me.isMate()) {   // 메이트 화면: 새 인증이 맨 위 (F-UI-17)
            items = items.stream().sorted((x, y) -> {
                if (x.lastVisitAt() == null && y.lastVisitAt() == null) return Long.compare(y.matchId(), x.matchId());
                if (x.lastVisitAt() == null) return 1;
                if (y.lastVisitAt() == null) return -1;
                return y.lastVisitAt().compareTo(x.lastVisitAt());
            }).toList();
        }
        return items;
    }

    /** MATCH-03 매칭 상세 */
    @Transactional(readOnly = true)
    public MatchDtos.MatchDetail detail(AuthUser me, Long matchId) {
        return views.detail(matchAccess.member(matchId, me), me.id());
    }

    /** MATCH-07 매칭 취소 (여행자만, F-22 메이트는 취소 불가) */
    @Transactional
    public MatchDtos.CancelResponse cancel(AuthUser me, Long matchId) {
        Match m = matchAccess.memberForUpdate(matchId, me);
        if (m.getMateId().equals(me.id())) throw new ApiException(ErrorCode.MATE_CANNOT_CANCEL);
        m.cancel(LocalDateTime.now(clock));
        User traveler = userRepository.findById(me.id()).orElseThrow();
        notificationPublisher.publish(m.getMateId(), NotificationType.CANCELED, m.getId(), traveler.getNickname());
        matchRepository.flush();
        return new MatchDtos.CancelResponse(m.getId(), m.getStatus().name(), views.slotsOf(traveler));
    }

    /** MATCH-08 여행 완료 + 앨범 생성(서버 B가 이벤트로 생성) */
    @Transactional
    public MatchDtos.CompleteResponse complete(AuthUser me, Long matchId, MatchDtos.CompleteRequest req) {
        Match m = matchAccess.travelerMember(matchId, me, true);
        m.complete(LocalDateTime.now(clock));
        User traveler = userRepository.findById(me.id()).orElseThrow();
        // 서버 B 앨범 담당이 @EventListener 로 같은 트랜잭션에서 ALBUMS 생성
        eventPublisher.publishEvent(new MatchCompletedEvent(m.getId(),
                req == null ? null : req.albumTitle(), req == null ? null : req.coverUrl(), false));
        notificationPublisher.publish(m.getMateId(), NotificationType.COMPLETED, m.getId(), traveler.getNickname());
        matchRepository.flush();
        Long albumId = albumRepository.findByMatchId(m.getId()).map(a -> a.getId()).orElse(null);
        return new MatchDtos.CompleteResponse(m.getId(), m.getStatus().name(), albumId, views.slotsOf(traveler));
    }
}
