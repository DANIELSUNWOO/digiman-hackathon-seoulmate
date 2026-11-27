package server.match;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.match.domain.CancelReason;
import server.match.domain.Match;
import server.match.service.MatchDtos;
import server.match.service.MatchService;
import server.notification.domain.Notification;
import server.notification.domain.NotificationType;
import server.notification.repository.NotificationRepository;
import server.user.service.UserStatsService;
import org.springframework.data.domain.PageRequest;
import server.trip.domain.Trip;
import server.trip.repository.TripRepository;
import server.user.domain.Gender;
import server.user.domain.GenderPref;
import server.user.domain.MatchPreference;
import server.user.domain.User;
import server.user.repository.MatchPreferenceRepository;
import server.user.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class MatchApplyIntegrationTest {

    @Autowired MatchService matchService;
    @Autowired UserRepository userRepository;
    @Autowired TripRepository tripRepository;
    @Autowired MatchPreferenceRepository preferenceRepository;
    @Autowired SecretMapRepository mapRepository;
    @Autowired SpotRepository spotRepository;
    @Autowired MatchRepository matchRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired UserStatsService userStatsService;

    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
    private final LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

    private User user(String country, Gender gender, int birthYear) {
        User u = User.register(UUID.randomUUID(), country, 5, now);
        String nick = (country + UUID.randomUUID()).substring(0, 8);
        u.registerProfile(nick, gender, birthYear, null, null);
        u.verify();
        return userRepository.save(u);
    }

    /** 일정 + 매칭 조건(성별 무관, 20·30대)까지 마친 여행자 */
    private User traveler() {
        User t = user("JP", Gender.FEMALE, 2000);
        tripRepository.save(Trip.of(t.getId(), today, today.plusDays(3), now));
        preferenceRepository.save(MatchPreference.of(t.getId(), GenderPref.ANY, List.of(20, 30)));
        return t;
    }

    /** 20대 메이트 */
    private User mateUser() {
        return user("KR", Gender.FEMALE, 2001);
    }

    /** 메이트의 지도. spots 곳, 그중 2곳 공개 (spots ≥ 5 이면 공개 조건 충족) */
    private Long map(User mate, int spots) {
        SecretMap map = mapRepository.save(SecretMap.of(mate.getId(), "성수 카페", "조용한 카페", now));
        for (int i = 0; i < spots; i++) {
            Spot s = Spot.of(map.getId(), "스팟" + i, null, new BigDecimal("37.5447000"), new BigDecimal("127.0582000"),
                    null, null, null, i);
            s.setPreview(i < 2);
            spotRepository.save(s);
        }
        return map.getId();
    }

    private Long publicMap() {
        return map(mateUser(), 5);
    }

    private static AuthUser auth(User u) {
        return new AuthUser(u.getId(), u.getRole(), null);
    }

    private static ErrorCode codeOf(Throwable t) {
        return ((ApiException) t).getErrorCode();
    }

    private List<NotificationType> notificationsOf(User u) {
        return notificationRepository.findByUserIdOrderByIdDesc(u.getId(), PageRequest.of(0, 50)).stream()
                .map(Notification::getType).toList();
    }

    @Test
    void 지도를_고르면_바로_매칭되고_코스가_확정된다() {
        User t = traveler(), m = mateUser();
        Long mapId = map(m, 7);
        var res = matchService.apply(auth(t), mapId);
        assertThat(res.status()).isEqualTo("ON_COURSE");
        assertThat(res.chatStatus()).isEqualTo("LOCKED");
        assertThat(res.courseMap().mapId()).isEqualTo(mapId);
        assertThat(res.progress().required()).isEqualTo(3);          // 7곳 → 내림 3곳
        assertThat(res.progress().total()).isEqualTo(7);
        assertThat(res.slots().used()).isEqualTo(1);
        assertThat(res.slots().total()).isEqualTo(5);

        Match saved = matchRepository.findById(res.matchId()).orElseThrow();
        assertThat(saved.getCourseMapId()).isEqualTo(mapId);
        assertThat(saved.getRequiredVisits()).isEqualTo(3);
        assertThat(notificationsOf(m)).containsExactly(NotificationType.MATCHED);
    }

    @Test
    void 같은_메이트의_다른_지도도_고를_수_있다() {
        User t = traveler(), m = mateUser();
        matchService.apply(auth(t), map(m, 5));
        var second = matchService.apply(auth(t), map(m, 6));
        assertThat(second.slots().used()).isEqualTo(2);
    }

    @Test
    void 같은_지도를_두번_고르면_MAP_ALREADY_SELECTED() {
        User t = traveler();
        Long mapId = publicMap();
        matchService.apply(auth(t), mapId);
        assertThatThrownBy(() -> matchService.apply(auth(t), mapId))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.MAP_ALREADY_SELECTED));
    }

    @Test
    void 다섯_칸을_다_쓰면_NO_FREE_SLOT() {
        User t = traveler();
        for (int i = 0; i < 5; i++) matchService.apply(auth(t), publicMap());
        Long sixth = publicMap();
        assertThatThrownBy(() -> matchService.apply(auth(t), sixth))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.NO_FREE_SLOT));
    }

    @Test
    void 공개_조건을_못_채운_지도는_MAP_NOT_AVAILABLE() {
        User t = traveler();
        Long notPublic = map(mateUser(), 4);
        assertThatThrownBy(() -> matchService.apply(auth(t), notPublic))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.MAP_NOT_AVAILABLE));
    }

    @Test
    void 없는_지도는_MAP_NOT_FOUND() {
        User t = traveler();
        assertThatThrownBy(() -> matchService.apply(auth(t), 999_999L))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.MAP_NOT_FOUND));
    }

    @Test
    void 연령대_조건에_안_맞는_메이트의_지도는_MAP_NOT_AVAILABLE() {
        User t = traveler();                                   // 20·30대만 원함
        Long olderMap = map(user("KR", Gender.FEMALE, 1980), 5);   // 40대
        assertThatThrownBy(() -> matchService.apply(auth(t), olderMap))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.MAP_NOT_AVAILABLE));
    }

    @Test
    void 일정이_없으면_TRIP_REQUIRED() {
        User t = user("JP", Gender.FEMALE, 2000);
        preferenceRepository.save(MatchPreference.of(t.getId(), GenderPref.ANY, List.of(20)));
        Long mapId = publicMap();
        assertThatThrownBy(() -> matchService.apply(auth(t), mapId))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.TRIP_REQUIRED));
    }

    @Test
    void 메이트_정원_10건이_차면_MATE_FULL() {
        Long mapId = publicMap();
        for (int i = 0; i < 10; i++) matchService.apply(auth(traveler()), mapId);
        User eleventh = traveler();
        assertThatThrownBy(() -> matchService.apply(auth(eleventh), mapId))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.MATE_FULL));
    }

    @Test
    void 정원_마지막_1자리에_동시에_5명이_고르면_1명만_성공() throws Exception {
        User m = mateUser();
        Long mapId = map(m, 5);
        for (int i = 0; i < 9; i++) matchService.apply(auth(traveler()), mapId);
        List<User> travelers = new ArrayList<>();
        for (int i = 0; i < 5; i++) travelers.add(traveler());

        ExecutorService pool = Executors.newFixedThreadPool(5);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger full = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();
        for (User t : travelers) {
            futures.add(pool.submit(() -> {
                start.await();
                try {
                    matchService.apply(auth(t), mapId);
                    success.incrementAndGet();
                } catch (ApiException e) {
                    if (e.getErrorCode() == ErrorCode.MATE_FULL) full.incrementAndGet();
                }
                return null;
            }));
        }
        start.countDown();
        for (Future<?> f : futures) f.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(success.get()).isEqualTo(1);
        assertThat(full.get()).isEqualTo(4);
        assertThat(matchRepository.countByMateIdAndStatusIn(m.getId(), MatchStatus.ACTIVE)).isEqualTo(10);
    }

    @Test
    void 여행자가_끊으면_칸이_돌아오고_사유가_저장된다() {
        User t = traveler(), m = mateUser();
        Long matchId = matchService.apply(auth(t), map(m, 5)).matchId();
        var res = matchService.cancel(auth(t), matchId, new MatchDtos.CancelRequest(CancelReason.PLAN_CHANGED, null));
        assertThat(res.status()).isEqualTo("CANCELED");
        assertThat(res.slots().used()).isZero();
        Match saved = matchRepository.findById(matchId).orElseThrow();
        assertThat(saved.getCancelReason()).isEqualTo(CancelReason.PLAN_CHANGED);
        assertThat(saved.getCanceledBy()).isEqualTo(t.getId());
        assertThat(notificationsOf(m)).contains(NotificationType.CANCELED);
    }

    @Test
    void 메이트도_끊을_수_있고_응답에_칸은_없다() {
        User t = traveler(), m = mateUser();
        Long matchId = matchService.apply(auth(t), map(m, 5)).matchId();
        var res = matchService.cancel(auth(m), matchId, null);          // 사유 생략
        assertThat(res.status()).isEqualTo("CANCELED");
        assertThat(res.slots()).isNull();
        assertThat(notificationsOf(t)).contains(NotificationType.CANCELED);
        assertThatThrownBy(() -> matchService.cancel(auth(t), matchId, null))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.MATCH_NOT_ACTIVE));
    }

    @Test
    void 메이트는_지도별로_매칭을_볼_수_있다() {
        User m = mateUser();
        Long mapA = map(m, 5), mapB = map(m, 5);
        matchService.apply(auth(traveler()), mapA);
        matchService.apply(auth(traveler()), mapA);
        matchService.apply(auth(traveler()), mapB);
        assertThat(matchService.list(auth(m), null, mapA)).hasSize(2);
        assertThat(matchService.list(auth(m), "active", mapB)).hasSize(1);
        assertThat(matchService.list(auth(m), null, null)).hasSize(3);
    }

    @Test
    void 활동_요약은_역할별로_다르다() {
        User t = traveler(), m = mateUser();
        matchService.apply(auth(t), map(m, 5));
        matchService.apply(auth(t), map(m, 5));                          // 같은 메이트는 1명
        matchService.apply(auth(t), publicMap());

        var travelerStats = (UserStatsService.TravelerStats) userStatsService.stats(auth(t));
        assertThat(travelerStats.tripDay()).isEqualTo(1);                // 여행 시작일 = 오늘
        assertThat(travelerStats.matesMet()).isEqualTo(2);
        assertThat(travelerStats.visitedSpots()).isZero();

        var mateStats = (UserStatsService.MateStats) userStatsService.stats(auth(m));
        assertThat(mateStats.activeDays()).isEqualTo(1);
        assertThat(mateStats.travelersMet()).isEqualTo(1);
        assertThat(mateStats.completedMaps()).isEqualTo(2);
    }
}
