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
import server.match.service.MatchService;
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

    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
    private final LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

    private User user(String country, Gender gender, int birthYear) {
        User u = User.register(UUID.randomUUID(), country, 1, now);
        String nick = (country + UUID.randomUUID()).substring(0, 12);
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

    /** 공개 지도(스팟 5곳 + 공개 2곳)가 있는 20대 메이트 */
    private User mate() {
        User m = user("KR", Gender.FEMALE, 2001);
        SecretMap map = mapRepository.save(SecretMap.of(m.getId(), "성수 카페", "조용한 카페", now));
        for (int i = 0; i < 5; i++) {
            Spot s = Spot.of(map.getId(), "스팟" + i, null, new BigDecimal("37.5447000"), new BigDecimal("127.0582000"),
                    null, null, null, i);
            s.setPreview(i < 2);
            spotRepository.save(s);
        }
        return m;
    }

    private static AuthUser auth(User u) {
        return new AuthUser(u.getId(), u.getRole(), null);
    }

    private static ErrorCode codeOf(Throwable t) {
        return ((ApiException) t).getErrorCode();
    }

    @Test
    void 매칭_성공하면_칸을_1개_쓴다() {
        User t = traveler(), m = mate();
        var res = matchService.apply(auth(t), m.getId());
        assertThat(res.status()).isEqualTo("MATCHED");
        assertThat(res.slots().used()).isEqualTo(1);
    }

    @Test
    void 빈_칸이_없으면_NO_FREE_SLOT() {
        User t = traveler();
        matchService.apply(auth(t), mate().getId());
        UUID second = mate().getId();
        assertThatThrownBy(() -> matchService.apply(auth(t), second))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.NO_FREE_SLOT));
    }

    @Test
    void 공개_지도가_없는_메이트는_MATE_NOT_AVAILABLE() {
        User t = traveler();
        User noMap = user("KR", Gender.MALE, 1999);
        assertThatThrownBy(() -> matchService.apply(auth(t), noMap.getId()))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.MATE_NOT_AVAILABLE));
    }

    @Test
    void 연령대_조건에_안_맞으면_MATE_NOT_AVAILABLE() {
        User t = traveler();                                   // 20·30대만 원함
        User older = user("KR", Gender.FEMALE, 1980);          // 40대
        SecretMap map = mapRepository.save(SecretMap.of(older.getId(), "을지로", null, now));
        for (int i = 0; i < 5; i++) {
            Spot s = Spot.of(map.getId(), "s" + i, null, BigDecimal.ONE, BigDecimal.ONE, null, null, null, i);
            s.setPreview(i < 2);
            spotRepository.save(s);
        }
        assertThatThrownBy(() -> matchService.apply(auth(t), older.getId()))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.MATE_NOT_AVAILABLE));
    }

    @Test
    void 일정이_없으면_TRIP_REQUIRED() {
        User t = user("JP", Gender.FEMALE, 2000);
        preferenceRepository.save(MatchPreference.of(t.getId(), GenderPref.ANY, List.of(20)));
        UUID mateId = mate().getId();
        assertThatThrownBy(() -> matchService.apply(auth(t), mateId))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.TRIP_REQUIRED));
    }

    @Test
    void 메이트_정원_10건이_차면_MATE_FULL() {
        User m = mate();
        for (int i = 0; i < 10; i++) matchService.apply(auth(traveler()), m.getId());
        User eleventh = traveler();
        assertThatThrownBy(() -> matchService.apply(auth(eleventh), m.getId()))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.MATE_FULL));
    }

    @Test
    void 정원_마지막_1자리에_동시에_5명이_신청해도_1명만_성공() throws Exception {
        User m = mate();
        for (int i = 0; i < 9; i++) matchService.apply(auth(traveler()), m.getId());
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
                    matchService.apply(auth(t), m.getId());
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
    void 취소하면_칸이_돌아오고_메이트는_취소할_수_없다() {
        User t = traveler(), m = mate();
        Long matchId = matchService.apply(auth(t), m.getId()).matchId();
        assertThatThrownBy(() -> matchService.cancel(auth(m), matchId))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.MATE_CANNOT_CANCEL));
        var canceled = matchService.cancel(auth(t), matchId);
        assertThat(canceled.status()).isEqualTo("CANCELED");
        assertThat(canceled.slots().used()).isZero();
    }
}
