package server.visit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.match.domain.ChatStatus;
import server.match.domain.Match;
import server.match.repository.MatchRepository;
import server.notification.domain.Notification;
import server.notification.domain.NotificationType;
import server.notification.repository.NotificationRepository;
import server.trip.domain.Trip;
import server.trip.repository.TripRepository;
import server.user.domain.Gender;
import server.user.domain.User;
import server.user.repository.UserRepository;
import server.visit.repository.SpotVisitRepository;
import server.visit.service.VisitService;
import server.visit.service.VisitService.ReactionRequest;
import server.visit.service.VisitService.VisitRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** VISIT-01~03 통합 테스트 (H2, DEMO_MODE=false 라서 200m 위치 확인이 실제로 동작한다) */
@SpringBootTest
@ActiveProfiles("test")
class VisitServiceIntegrationTest {

    @Autowired VisitService visitService;
    @Autowired UserRepository userRepository;
    @Autowired TripRepository tripRepository;
    @Autowired MatchRepository matchRepository;
    @Autowired SecretMapRepository mapRepository;
    @Autowired SpotRepository spotRepository;
    @Autowired SpotVisitRepository visitRepository;
    @Autowired NotificationRepository notificationRepository;

    private static final BigDecimal SPOT_LAT = new BigDecimal("37.5447000");
    private static final BigDecimal SPOT_LNG = new BigDecimal("127.0582000");
    private static final double NEAR_LAT = 37.5449, NEAR_LNG = 127.0580;   // 스팟에서 약 30m
    private static final double FAR_LAT = 37.5663, FAR_LNG = 126.9779;     // 시청, 약 8km

    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
    private final LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

    private User user(String country) {
        User u = User.register(UUID.randomUUID(), country, 5, now);
        u.registerProfile((country + UUID.randomUUID()).substring(0, 12), Gender.MALE, 1995, null, null);
        u.verify();
        return userRepository.save(u);
    }

    private static AuthUser auth(User u) {
        return new AuthUser(u.getId(), u.getRole(), null);
    }

    /** 여행자·메이트·5곳 지도. courseSelected 면 그 지도를 코스로 고른 상태 (필요 인증 3곳) */
    private record Fixture(User traveler, User mate, Long matchId, Long mapId, List<Long> spotIds) {}

    private Fixture fixture(boolean courseSelected) {
        User traveler = user("JP");
        User mate = user("KR");
        SecretMap map = mapRepository.save(SecretMap.of(mate.getId(), "성수", null, now));
        List<Long> spotIds = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            Spot s = Spot.of(map.getId(), "스팟" + i, null, SPOT_LAT, SPOT_LNG, null, null, null, i);
            s.setPreview(i < 2);
            spotIds.add(spotRepository.save(s).getId());
        }
        Trip trip = tripRepository.save(Trip.of(traveler.getId(), today, today.plusDays(3), now));
        Match m = Match.create(trip.getId(), traveler.getId(), mate.getId(), now);
        if (courseSelected) m.selectCourse(map.getId(), 3, now);
        m = matchRepository.save(m);
        return new Fixture(traveler, mate, m.getId(), map.getId(), spotIds);
    }

    private static VisitRequest near(Long spotId) {
        return new VisitRequest(spotId, "https://img/visit.jpg", "窓際の席が本当に落ち着きました", NEAR_LAT, NEAR_LNG);
    }

    private List<NotificationType> notificationsOf(User u) {
        return notificationRepository.findByUserIdOrderByIdDesc(u.getId(), PageRequest.of(0, 50)).stream()
                .map(Notification::getType).toList();
    }

    private static void assertError(Runnable call, ErrorCode code) {
        assertThatThrownBy(call::run).isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode()).isEqualTo(code);
    }

    @Test
    void 필요한_수만큼_인증하면_채팅_요청으로_바뀐다() {
        Fixture f = fixture(true);
        AuthUser traveler = auth(f.traveler());

        var first = visitService.verify(traveler, f.matchId(), near(f.spotIds().get(0)));
        assertThat(first.progress().visited()).isEqualTo(1);
        assertThat(first.progress().required()).isEqualTo(3);
        assertThat(first.progress().total()).isEqualTo(5);
        assertThat(first.chatRequested()).isFalse();
        assertThat(first.verifiedAt().getOffset().getTotalSeconds()).isEqualTo(9 * 3600);

        assertThat(visitService.verify(traveler, f.matchId(), near(f.spotIds().get(1))).chatRequested()).isFalse();
        var third = visitService.verify(traveler, f.matchId(), near(f.spotIds().get(2)));
        assertThat(third.chatRequested()).isTrue();
        assertThat(third.progress().visited()).isEqualTo(3);

        // 4번째 인증은 이미 요청된 상태라 다시 요청하지 않는다
        assertThat(visitService.verify(traveler, f.matchId(), near(f.spotIds().get(3))).chatRequested()).isFalse();

        assertThat(matchRepository.findById(f.matchId()).orElseThrow().getChatStatus()).isEqualTo(ChatStatus.REQUESTED);
        assertThat(notificationsOf(f.mate())).filteredOn(t -> t == NotificationType.VISIT).hasSize(4);
        assertThat(notificationsOf(f.mate())).filteredOn(t -> t == NotificationType.CHAT_REQUEST).hasSize(1);
        assertThat(notificationsOf(f.traveler())).filteredOn(t -> t == NotificationType.CHAT_REQUEST).hasSize(1);

        // 메이트도 목록을 본다. 최근 인증 순
        var list = visitService.list(auth(f.mate()), f.matchId());
        assertThat(list).hasSize(4);
        assertThat(list.get(0).spot().spotId()).isEqualTo(f.spotIds().get(3));
        assertThat(list.get(0).spot().name()).isEqualTo("스팟3");
        assertThat(list.get(0).review().sourceLang()).isEqualTo("ja");
        assertThat(list.get(0).reactions()).isEmpty();
    }

    @Test
    void 위치가_없거나_200m_밖이면_저장하지_않는다() {
        Fixture f = fixture(true);
        AuthUser traveler = auth(f.traveler());
        Long spotId = f.spotIds().get(0);

        assertError(() -> visitService.verify(traveler, f.matchId(),
                new VisitRequest(spotId, "https://img/v.jpg", "後記", null, null)), ErrorCode.LOCATION_REQUIRED);
        assertError(() -> visitService.verify(traveler, f.matchId(),
                new VisitRequest(spotId, "https://img/v.jpg", "後記", FAR_LAT, FAR_LNG)), ErrorCode.OUT_OF_RANGE);

        assertThat(visitRepository.countByMatchId(f.matchId())).isZero();
        assertThat(notificationsOf(f.mate())).doesNotContain(NotificationType.VISIT);
    }

    @Test
    void 코스_스팟을_한_번씩만_여행자_본인이_인증한다() {
        Fixture f = fixture(true);
        Fixture other = fixture(true);
        AuthUser traveler = auth(f.traveler());

        visitService.verify(traveler, f.matchId(), near(f.spotIds().get(0)));
        assertError(() -> visitService.verify(traveler, f.matchId(), near(f.spotIds().get(0))), ErrorCode.ALREADY_VISITED);
        assertError(() -> visitService.verify(traveler, f.matchId(), near(other.spotIds().get(0))), ErrorCode.SPOT_NOT_IN_COURSE);
        assertError(() -> visitService.verify(traveler, f.matchId(), near(-1L)), ErrorCode.SPOT_NOT_IN_COURSE);
        assertError(() -> visitService.verify(auth(f.mate()), f.matchId(), near(f.spotIds().get(1))), ErrorCode.ROLE_FORBIDDEN);
        assertError(() -> visitService.verify(auth(other.traveler()), f.matchId(), near(f.spotIds().get(1))), ErrorCode.NOT_MATCH_MEMBER);
        assertError(() -> visitService.list(auth(other.mate()), f.matchId()), ErrorCode.NOT_MATCH_MEMBER);
    }

    @Test
    void 코스_선택_전이나_끝난_매칭은_인증할_수_없다() {
        Fixture before = fixture(false);
        assertError(() -> visitService.verify(auth(before.traveler()), before.matchId(), near(before.spotIds().get(0))),
                ErrorCode.MATCH_NOT_ON_COURSE);

        Fixture canceled = fixture(true);
        Match m = matchRepository.findById(canceled.matchId()).orElseThrow();
        m.cancel(now);
        matchRepository.save(m);
        assertError(() -> visitService.verify(auth(canceled.traveler()), canceled.matchId(), near(canceled.spotIds().get(0))),
                ErrorCode.MATCH_NOT_ON_COURSE);
    }

    @Test
    void 메이트가_리액션을_남기면_여행자에게_알림이_가고_목록에_붙는다() {
        Fixture f = fixture(true);
        Long visitId = visitService.verify(auth(f.traveler()), f.matchId(), near(f.spotIds().get(0))).visitId();
        AuthUser mate = auth(f.mate());

        Long reactionId = visitService.react(mate, visitId, new ReactionRequest("❤️", " 거기 창가 최고죠! ")).reactionId();
        visitService.react(mate, visitId, new ReactionRequest("👍", null));

        var reactions = visitService.list(auth(f.traveler()), f.matchId()).get(0).reactions();
        assertThat(reactions).hasSize(2);
        assertThat(reactions.get(0).reactionId()).isEqualTo(reactionId);
        assertThat(reactions.get(0).comment().original()).isEqualTo("거기 창가 최고죠!");
        assertThat(reactions.get(0).comment().sourceLang()).isEqualTo("ko");
        assertThat(reactions.get(1).comment()).isNull();
        assertThat(notificationsOf(f.traveler())).filteredOn(t -> t == NotificationType.REACTION).hasSize(2);

        assertError(() -> visitService.react(mate, visitId, new ReactionRequest(" ", null)), ErrorCode.VALIDATION_ERROR);
        assertError(() -> visitService.react(auth(f.traveler()), visitId, new ReactionRequest("❤️", null)), ErrorCode.ROLE_FORBIDDEN);
        Fixture other = fixture(true);
        assertError(() -> visitService.react(auth(other.mate()), visitId, new ReactionRequest("❤️", null)), ErrorCode.NOT_MATCH_MEMBER);
        assertError(() -> visitService.react(mate, -1L, new ReactionRequest("❤️", null)), ErrorCode.VISIT_NOT_FOUND);
    }
}
