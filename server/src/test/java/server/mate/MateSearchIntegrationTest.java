package server.mate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.mate.service.MateSearchService;
import server.mate.service.MateSearchService.MateCard;
import server.tag.domain.UserTag;
import server.tag.repository.UserTagRepository;
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
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * MATE-01 통합 테스트 (H2).
 * H2 데이터는 다른 테스트와 공유되므로, 여행자 조건을 "남성 · 50대 이상"으로 둬서 이 테스트가 만든 메이트만 목록에 나오게 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
class MateSearchIntegrationTest {

    @Autowired MateSearchService mateSearchService;
    @Autowired UserRepository userRepository;
    @Autowired TripRepository tripRepository;
    @Autowired MatchPreferenceRepository preferenceRepository;
    @Autowired UserTagRepository userTagRepository;
    @Autowired SecretMapRepository mapRepository;
    @Autowired SpotRepository spotRepository;

    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
    private final LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

    private User user(String country, Gender gender, int birthYear, boolean verified) {
        User u = User.register(UUID.randomUUID(), country, 5, now);
        u.registerProfile((country + UUID.randomUUID()).substring(0, 12), gender, birthYear, null, null);
        if (verified) u.verify();
        return userRepository.save(u);
    }

    private void tags(User u, long... tagIds) {
        for (long id : tagIds) userTagRepository.save(UserTag.of(u.getId(), id));
    }

    /** spotCount 곳짜리 지도. previewCount 가 2 면 공개 지도 */
    private void map(User mate, int spotCount, int previewCount) {
        SecretMap map = mapRepository.save(SecretMap.of(mate.getId(), "지도", "캡션", now));
        for (int i = 0; i < spotCount; i++) {
            Spot s = Spot.of(map.getId(), "스팟" + i, null, new BigDecimal("37.5447000"), new BigDecimal("127.0582000"),
                    null, null, null, i);
            s.setPreview(i < previewCount);
            spotRepository.save(s);
        }
    }

    /** 일정 + 매칭 조건(남성, 50대 이상) + 취향 9001~9003 을 마친 여행자 */
    private User traveler() {
        User t = user("JP", Gender.FEMALE, 2000, true);
        tripRepository.save(Trip.of(t.getId(), today, today.plusDays(3), now));
        preferenceRepository.save(MatchPreference.of(t.getId(), GenderPref.MALE, List.of(50)));
        tags(t, 9001, 9002, 9003);
        return t;
    }

    private static List<UUID> ids(MateSearchService.MateListResponse res) {
        return res.items().stream().map(c -> c.mate().userId()).toList();
    }

    @Test
    void 취향_일치순_핀순_필터가_동작하고_조건_밖_메이트는_빠진다() {
        User t = traveler();
        User a = user("KR", Gender.MALE, 1970, true);   // 취향 3개 겹침, 5곳 지도
        tags(a, 9001, 9002, 9003);
        map(a, 5, 2);
        User b = user("KR", Gender.MALE, 1972, true);   // 취향 1개 겹침, 8곳 지도
        tags(b, 9001);
        map(b, 8, 2);
        User noPublicMap = user("KR", Gender.MALE, 1971, true);  // 3곳뿐이라 비공개
        map(noPublicMap, 3, 2);
        User female = user("KR", Gender.FEMALE, 1970, true);     // 성별 조건 밖
        map(female, 5, 2);

        var taste = mateSearchService.search(t.getId(), null, null, null, null, 50);
        assertThat(ids(taste)).containsExactly(a.getId(), b.getId());
        MateCard first = taste.items().get(0);
        assertThat(first.commonTagCount()).isEqualTo(3);
        assertThat(first.pinCount()).isEqualTo(5);
        assertThat(first.selectedCount()).isZero();

        var pins = mateSearchService.search(t.getId(), "PINS", null, null, null, 50);
        assertThat(ids(pins)).containsExactly(b.getId(), a.getId());

        var filtered = mateSearchService.search(t.getId(), null, 6, null, null, 50);
        assertThat(ids(filtered)).containsExactly(b.getId());
    }

    @Test
    void 일정이_없으면_TRIP_REQUIRED() {
        User t = user("JP", Gender.FEMALE, 2000, true);
        preferenceRepository.save(MatchPreference.of(t.getId(), GenderPref.ANY, List.of(20)));
        assertThatThrownBy(() -> mateSearchService.search(t.getId(), null, null, null, null, null))
                .satisfies(e -> assertThat(((ApiException) e).getErrorCode()).isEqualTo(ErrorCode.TRIP_REQUIRED));
    }

    @Test
    void 여권_인증_전이면_NOT_VERIFIED() {
        User t = user("JP", Gender.FEMALE, 2000, false);
        assertThatThrownBy(() -> mateSearchService.search(t.getId(), null, null, null, null, null))
                .satisfies(e -> assertThat(((ApiException) e).getErrorCode()).isEqualTo(ErrorCode.NOT_VERIFIED));
    }

    @Test
    void 핀_범위가_잘못되면_VALIDATION_ERROR() {
        User t = traveler();
        assertThatThrownBy(() -> mateSearchService.search(t.getId(), null, 3, null, null, null))
                .satisfies(e -> assertThat(((ApiException) e).getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    void 페이지_값이_잘못되면_후보가_없어도_400() {
        User t = traveler();
        for (Integer[] ps : new Integer[][]{{-1, 20}, {0, 0}}) {
            assertThatThrownBy(() -> mateSearchService.search(t.getId(), null, null, null, ps[0], ps[1]))
                    .isInstanceOf(ApiException.class)
                    .extracting(e -> ((ApiException) e).getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
        }
    }
}
