package server.match.service;

import server.global.common.Times;
import server.global.config.PolicyProperties;
import server.map.domain.SecretMap;
import server.map.repository.SecretMapRepository;
import server.map.service.MapQuery;
import server.map.service.MapSelectability;
import server.global.common.UserSummary;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.album.service.AlbumService;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

/** 티켓 4·5: 지도 선택(매칭 + 코스 확정)·끊기·완료, 칸, 메이트 정원 동시성, 상태머신 (API v1.7) */
@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final TripRepository tripRepository;
    private final MatchPreferenceRepository preferenceRepository;
    private final MateEligibility mateEligibility;
    private final UserRepository userRepository;
    private final MatchAccess matchAccess;
    private final SecretMapRepository mapRepository;
    private final MapQuery mapQuery;
    private final MapSelectability mapSelectability;
    private final PolicyProperties policy;
    private final MatchViewAssembler views;
    private final NotificationPublisher notificationPublisher;
    private final AlbumService albumService;
    private final Clock clock;

    /**
     * MATCH-01 (API v1.7) 지도 선택 = 매칭 + 코스 확정 (한 트랜잭션).
     *  - 지도 1개 = 칸 1개, 최대 5개. 같은 메이트의 다른 지도도 고를 수 있다 (지도마다 매칭 1개).
     *  - 앱이 보낸 mapId 만 믿지 않고 MAP-07 목록 조건을 서버 B 의 MapSelectability 로 다시 확인한다.
     *  - required_visits = floor(코스 스팟 수 × 0.5) 를 이때 저장한다.
     * 동시성: 사용자 행 2개를 항상 같은 순서(UUID 작은 쪽 먼저)로 잠근 뒤 칸·정원·중복을 센다.
     * 여러 여행자가 같은 메이트에게 동시에 와도 메이트 행 잠금에서 줄을 서므로 11건이 되지 않고,
     * 같은 여행자가 같은 지도를 두 번 보내도 여행자 행 잠금에서 줄을 서서 MAP_ALREADY_SELECTED 가 된다.
     */
    @Transactional
    public MatchDtos.ApplyResponse apply(AuthUser me, Long mapId) {
        LocalDate today = LocalDate.now(clock);
        SecretMap map = mapRepository.findById(mapId).orElseThrow(() -> new ApiException(ErrorCode.MAP_NOT_FOUND));
        UUID mateId = map.getMateId();
        if (me.id().equals(mateId)) throw new ApiException(ErrorCode.MAP_NOT_AVAILABLE);

        UUID first = me.id().compareTo(mateId) < 0 ? me.id() : mateId;
        UUID second = first.equals(me.id()) ? mateId : me.id();
        User a = lockUser(first);
        User b = lockUser(second);
        if (a == null || b == null) throw new ApiException(ErrorCode.MAP_NOT_AVAILABLE);
        User traveler = a.getId().equals(me.id()) ? a : b;
        User mate = a.getId().equals(me.id()) ? b : a;

        if (!traveler.isVerified()) throw new ApiException(ErrorCode.NOT_VERIFIED);
        Trip trip = tripRepository.findFirstByTravelerIdAndEndDateGreaterThanEqualOrderByIdDesc(traveler.getId(), today)
                .orElseThrow(() -> new ApiException(ErrorCode.TRIP_REQUIRED));
        MatchPreference pref = preferenceRepository.findById(traveler.getId())
                .orElseThrow(() -> new ApiException(ErrorCode.PREFERENCES_REQUIRED));

        long used = matchRepository.countByTravelerIdAndStatusIn(traveler.getId(), MatchStatus.ACTIVE);
        // 서버 B MapSelectability = MAP-07 목록과 같은 기준
        // MAP_ALREADY_SELECTED(재전송 등) / MAP_NOT_AVAILABLE(공개 조건·성별·연령대·차단) / MATE_FULL(진행 중 10건)
        mapSelectability.requireSelectable(traveler, pref, mapId);
        if (used >= traveler.getMatchSlots()) throw new ApiException(ErrorCode.NO_FREE_SLOT);

        int spotCount = (int) mapQuery.spotCount(mapId);
        LocalDateTime now = LocalDateTime.now(clock);
        Match match = matchRepository.save(Match.create(trip.getId(), traveler.getId(), mate.getId(), mapId,
                policy.requiredVisits(spotCount), now));
        notificationPublisher.publish(mate.getId(), NotificationType.MATCHED, match.getId());

        return new MatchDtos.ApplyResponse(match.getId(), match.getStatus().name(), match.getChatStatus().name(),
                UserSummary.of(mate, today), views.courseMap(map, traveler.getId(), match),
                new MatchDtos.Progress(0, match.getRequiredVisits(), spotCount), Times.kst(match.getMatchedAt()),
                new MatchDtos.Slots(traveler.getMatchSlots(), used + 1));
    }

    private User lockUser(UUID id) {
        return userRepository.findByIdForUpdate(id).orElse(null);
    }

    /**
     * MATCH-02 내 매칭 목록. state = active | ended | null(전체).
     * mapId 를 주면 그 지도로 맺은 매칭만 (메이트의 지도별 대화 목록 M-15).
     */
    @Transactional(readOnly = true)
    public List<MatchDtos.MatchItem> list(AuthUser me, String state, Long mapId) {
        Collection<MatchStatus> statuses = switch (state == null ? "" : state) {
            case "active" -> MatchStatus.ACTIVE;
            case "ended" -> MatchStatus.ENDED;
            case "" -> EnumSet.allOf(MatchStatus.class);
            default -> throw new ApiException(ErrorCode.VALIDATION_ERROR);
        };
        List<MatchDtos.MatchItem> items = matchRepository.findMine(me.id(), statuses).stream()
                .filter(m -> mapId == null || mapId.equals(m.getCourseMapId()))
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

    /**
     * MATCH-07 매칭 끊기 (API v1.7: 여행자·메이트 모두, 사유는 선택).
     * 여행자 칸은 바로 반환된다(진행 중 매칭 수로 세므로). 상대에게 CANCELED 알림, 사유는 상대에게 보여 주지 않는다.
     */
    @Transactional
    public MatchDtos.CancelResponse cancel(AuthUser me, Long matchId, MatchDtos.CancelRequest req) {
        Match m = matchAccess.memberForUpdate(matchId, me);
        m.cancel(me.id(), req == null ? null : req.reason(), req == null ? null : req.detail(), LocalDateTime.now(clock));
        notificationPublisher.publish(m.partnerOf(me.id()), NotificationType.CANCELED, m.getId());
        matchRepository.flush();
        MatchDtos.Slots slots = m.isTraveler(me.id())
                ? views.slotsOf(userRepository.findById(me.id()).orElseThrow()) : null;
        return new MatchDtos.CancelResponse(m.getId(), m.getStatus().name(), slots);
    }

    /** MATCH-08 여행 완료 + 앨범 생성(서버 B가 이벤트로 생성) */
    @Transactional
    public MatchDtos.CompleteResponse complete(AuthUser me, Long matchId, MatchDtos.CompleteRequest req) {
        Match m = matchAccess.travelerMember(matchId, me, true);
        m.complete(LocalDateTime.now(clock));
        User traveler = userRepository.findById(me.id()).orElseThrow();
        Long albumId = albumService.createForMatch(m.getId(),                    // B 구현
                req == null ? null : req.albumTitle(), req == null ? null : req.coverUrl());
        notificationPublisher.publish(m.getMateId(), NotificationType.COMPLETED, m.getId());
        matchRepository.flush();
        return new MatchDtos.CompleteResponse(m.getId(), m.getStatus().name(), albumId, views.slotsOf(traveler));
    }
}
