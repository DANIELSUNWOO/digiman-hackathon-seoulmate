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
import server.visit.domain.VisitReaction;
import server.visit.repository.SpotVisitRepository;
import server.visit.repository.VisitReactionRepository;
import server.visit.service.VisitService;
import server.visit.service.VisitService.CommentRequest;
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
    @Autowired VisitReactionRepository reactionRepository;
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
        assertThat(first.chatReady()).isFalse();
        assertThat(first.verifiedAt().getOffset().getTotalSeconds()).isEqualTo(9 * 3600);

        assertThat(visitService.verify(traveler, f.matchId(), near(f.spotIds().get(1))).chatReady()).isFalse();
        var third = visitService.verify(traveler, f.matchId(), near(f.spotIds().get(2)));
        assertThat(third.chatReady()).isTrue();
        assertThat(third.progress().visited()).isEqualTo(3);

        // 4번째 인증은 이미 요청된 상태라 다시 요청하지 않는다
        assertThat(visitService.verify(traveler, f.matchId(), near(f.spotIds().get(3))).chatReady()).isFalse();

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
        assertThat(list.get(0).reaction()).isNull();
        assertThat(list.get(0).comments()).isEmpty();
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
    void 리액션은_하나만_바꾸고_해제하고_댓글은_따로_쌓인다() {
        Fixture f = fixture(true);
        Long visitId = visitService.verify(auth(f.traveler()), f.matchId(), near(f.spotIds().get(0))).visitId();
        AuthUser mate = auth(f.mate());

        assertThat(visitService.setReaction(mate, visitId, new ReactionRequest("LIKE")).reaction()).isEqualTo("LIKE");
        visitService.setReaction(mate, visitId, new ReactionRequest(" cheer "));        // 바꾸기
        Long commentId = visitService.comment(mate, visitId, new CommentRequest(" 거기 창가 최고죠! ")).commentId();
        visitService.comment(mate, visitId, new CommentRequest("다음엔 2층도 가 보세요"));

        var item = visitService.list(auth(f.traveler()), f.matchId()).get(0);
        assertThat(item.reaction()).isEqualTo("CHEER");                                  // 하나만 남는다
        assertThat(item.comments()).hasSize(2);
        assertThat(item.comments().get(0).commentId()).isEqualTo(commentId);
        assertThat(item.comments().get(0).content().original()).isEqualTo("거기 창가 최고죠!");
        assertThat(item.comments().get(0).content().sourceLang()).isEqualTo("ko");
        // 알림: 처음 리액션 1번 + 댓글 2번 (바꾸기는 알리지 않음)
        assertThat(notificationsOf(f.traveler())).filteredOn(t -> t == NotificationType.REACTION).hasSize(3);

        visitService.clearReaction(mate, visitId);
        visitService.clearReaction(mate, visitId);                                       // 이미 없어도 그대로
        var cleared = visitService.list(auth(f.mate()), f.matchId()).get(0);
        assertThat(cleared.reaction()).isNull();
        assertThat(cleared.comments()).hasSize(2);                                       // 댓글은 그대로

        assertError(() -> visitService.setReaction(mate, visitId, new ReactionRequest("HEART")), ErrorCode.VALIDATION_ERROR);
        assertError(() -> visitService.setReaction(mate, visitId, new ReactionRequest(null)), ErrorCode.VALIDATION_ERROR);
        assertError(() -> visitService.comment(mate, visitId, new CommentRequest("  ")), ErrorCode.VALIDATION_ERROR);
        assertError(() -> visitService.setReaction(auth(f.traveler()), visitId, new ReactionRequest("LIKE")), ErrorCode.ROLE_FORBIDDEN);
        Fixture other = fixture(true);
        assertError(() -> visitService.comment(auth(other.mate()), visitId, new CommentRequest("안녕")), ErrorCode.NOT_MATCH_MEMBER);
        assertError(() -> visitService.setReaction(mate, -1L, new ReactionRequest("LIKE")), ErrorCode.VISIT_NOT_FOUND);
    }

    @Test
    void 이전_버전_기록도_댓글은_남기고_리액션은_하나로_정리한다() {
        Fixture f = fixture(true);
        Long visitId = visitService.verify(auth(f.traveler()), f.matchId(), near(f.spotIds().get(0))).visitId();
        AuthUser mate = auth(f.mate());
        // 이전 버전(v1.6)처럼 이모지+댓글 한 행, 이모지만 한 행을 직접 넣는다
        VisitReaction mixed = reactionRepository.save(VisitReaction.of(visitId, f.mate().getId(), "❤️", "예전 댓글", now));
        reactionRepository.save(VisitReaction.of(visitId, f.mate().getId(), "👍", null, now));

        var before = visitService.list(mate, f.matchId()).get(0);
        assertThat(before.reaction()).isNull();                         // 예전 자유 이모지는 리액션으로 보여 주지 않는다
        assertThat(before.comments()).extracting(c -> c.content().original()).containsExactly("예전 댓글");

        // 바꾸기: 첫 행만 남아 LIKE 가 되고, 나머지 리액션 행은 정리된다. 댓글은 그대로
        visitService.setReaction(mate, visitId, new ReactionRequest("LIKE"));
        var changed = visitService.list(mate, f.matchId()).get(0);
        assertThat(changed.reaction()).isEqualTo("LIKE");
        assertThat(changed.comments()).extracting(c -> c.content().original()).containsExactly("예전 댓글");
        assertThat(reactionRepository.findByVisitIdInOrderByIdAsc(List.of(visitId)))
                .filteredOn(VisitReaction::isReaction).hasSize(1);

        // 해제: 리액션만 지우고 댓글이 든 행은 남긴다
        visitService.clearReaction(mate, visitId);
        var cleared = visitService.list(mate, f.matchId()).get(0);
        assertThat(cleared.reaction()).isNull();
        assertThat(cleared.comments()).extracting(c -> c.content().original()).containsExactly("예전 댓글");
        assertThat(reactionRepository.findById(mixed.getId())).isPresent();
    }
}
