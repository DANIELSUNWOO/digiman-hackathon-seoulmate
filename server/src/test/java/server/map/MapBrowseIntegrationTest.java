package server.map;

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
import server.map.service.MapBrowseService;
import server.map.service.MapBrowseService.EmptyReason;
import server.map.service.MapBrowseService.MapBrowseResponse;
import server.map.service.MapBrowseService.MapCard;
import server.map.service.MapSelectability;
import server.match.domain.Match;
import server.match.repository.MatchRepository;
import server.safety.domain.Block;
import server.safety.domain.ReportReason;
import server.safety.repository.BlockRepository;
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
 * MAP-07 지도 고르기, MAP-08 미리보기, MATCH-01 용 MapSelectability (H2).
 * H2 데이터는 다른 테스트와 공유되므로 테스트마다 매칭 조건(성별·연령대)을 다르게 둬서 이 테스트가 만든 메이트만 목록에 나오게 한다.
 * (다른 테스트의 메이트는 모두 남성·1995년생)
 */
@SpringBootTest
@ActiveProfiles("test")
class MapBrowseIntegrationTest {

    @Autowired MapBrowseService mapBrowseService;
    @Autowired MapSelectability selectability;
    @Autowired UserRepository userRepository;
    @Autowired TripRepository tripRepository;
    @Autowired MatchPreferenceRepository preferenceRepository;
    @Autowired UserTagRepository userTagRepository;
    @Autowired SecretMapRepository mapRepository;
    @Autowired SpotRepository spotRepository;
    @Autowired MatchRepository matchRepository;
    @Autowired BlockRepository blockRepository;

    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
    private final LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

    private User user(String country, Gender gender, int birthYear) {
        User u = User.register(UUID.randomUUID(), country, 5, now);
        u.registerProfile((country + UUID.randomUUID()).substring(0, 12), gender, birthYear, null, null);
        u.verify();
        return userRepository.save(u);
    }

    private void tags(User u, long... tagIds) {
        for (long id : tagIds) userTagRepository.save(UserTag.of(u.getId(), id));
    }

    /** spotCount 곳짜리 지도. previewCount 가 2 면 공개 지도 */
    private Long map(User mate, String title, int spotCount, int previewCount) {
        SecretMap map = mapRepository.save(SecretMap.of(mate.getId(), title, "캡션", now));
        for (int i = 0; i < spotCount; i++) {
            Spot s = Spot.of(map.getId(), "스팟" + i, null, new BigDecimal("37.5447000"), new BigDecimal("127.0582000"),
                    null, "이유" + i, null, i);
            s.setPreview(i < previewCount);
            spotRepository.save(s);
        }
        return map.getId();
    }

    /** 일정 + 매칭 조건을 마친 여행자 */
    private User traveler(GenderPref genderPref, int ageChip, long... tagIds) {
        User t = user("JP", Gender.FEMALE, 2000);
        tripRepository.save(Trip.of(t.getId(), today, today.plusDays(3), now));
        preferenceRepository.save(MatchPreference.of(t.getId(), genderPref, List.of(ageChip)));
        tags(t, tagIds);
        return t;
    }

    /** 여행자가 지도를 고른 상태 (서버 A MATCH-01 과 같은 결과) */
    private Long select(UUID travelerId, UUID mateId, Long mapId) {
        Match m = Match.create(1L, travelerId, mateId, now);
        m.selectCourse(mapId, 2, now);
        return matchRepository.save(m).getId();
    }

    private static List<Long> ids(MapBrowseResponse res) {
        return res.items().stream().map(MapCard::mapId).toList();
    }

    private static void assertError(Runnable call, ErrorCode code) {
        assertThatThrownBy(call::run).isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode()).isEqualTo(code);
    }

    @Test
    void 공개_지도가_카드로_나오고_정렬_필터_미리보기가_동작한다() {
        User t = traveler(GenderPref.MALE, 50, 9101, 9102, 9103);
        User a = user("KR", Gender.MALE, 1970);                  // 취향 3개 겹침
        tags(a, 9101, 9102, 9103);
        Long a1 = map(a, "성수 카페", 5, 2);
        Long a2 = map(a, "을지로 노포", 8, 2);
        User b = user("KR", Gender.MALE, 1972);                  // 취향 1개 겹침
        tags(b, 9101);
        Long b1 = map(b, "연남동 산책", 6, 2);
        Long b2 = map(b, "미완성", 3, 2);                         // 스팟 3곳이라 비공개
        User female = user("KR", Gender.FEMALE, 1970);           // 성별 조건 밖
        Long f1 = map(female, "여성 메이트 지도", 5, 2);

        var recommended = mapBrowseService.browse(t.getId(), null, null, null, null, 50);
        assertThat(ids(recommended)).containsExactly(a1, a2, b1);   // 같은 메이트 지도 2개가 따로 카드
        assertThat(recommended.totalCount()).isEqualTo(3);
        assertThat(recommended.emptyReason()).isNull();
        MapCard first = recommended.items().get(0);
        assertThat(first.title().original()).isEqualTo("성수 카페");
        assertThat(first.mate().userId()).isEqualTo(a.getId());
        assertThat(first.pinCount()).isEqualTo(5);
        assertThat(first.selectedCount()).isZero();
        assertThat(first.myMatchId()).isNull();
        assertThat(ids(recommended)).doesNotContain(b2, f1);

        assertThat(ids(mapBrowseService.browse(t.getId(), "PINS_ASC", null, null, null, 50))).containsExactly(a1, b1, a2);
        assertThat(ids(mapBrowseService.browse(t.getId(), "PINS_DESC", null, null, null, 50))).containsExactly(a2, b1, a1);

        var ranged = mapBrowseService.browse(t.getId(), null, 6, 7, null, 50);
        assertThat(ids(ranged)).containsExactly(b1);
        assertThat(ranged.totalCount()).isEqualTo(1);

        var none = mapBrowseService.browse(t.getId(), null, 15, null, null, 50);
        assertThat(none.items()).isEmpty();
        assertThat(none.emptyReason()).isEqualTo(EmptyReason.NO_MAP_IN_RANGE);

        var onlyCount = mapBrowseService.browse(t.getId(), null, null, null, 0, 1);   // T-11c 결과 수
        assertThat(onlyCount.items()).hasSize(1);
        assertThat(onlyCount.totalCount()).isEqualTo(3);
        assertThat(onlyCount.hasNext()).isTrue();

        // 미리보기: 숨긴 스팟은 개수만
        var preview = mapBrowseService.preview(t.getId(), a2);
        assertThat(preview.spotCount()).isEqualTo(8);
        assertThat(preview.hiddenSpotCount()).isEqualTo(6);
        assertThat(preview.previewSpots()).extracting(MapBrowseService.PreviewSpot::name).containsExactly("스팟0", "스팟1");
        assertThat(preview.caption().original()).isEqualTo("캡션");
        assertThat(preview.myMatchId()).isNull();
        assertThat(preview.slots().total()).isEqualTo(5);
        assertThat(preview.slots().used()).isZero();
        assertError(() -> mapBrowseService.preview(t.getId(), b2), ErrorCode.MAP_NOT_AVAILABLE);
        assertError(() -> mapBrowseService.preview(t.getId(), f1), ErrorCode.MAP_NOT_AVAILABLE);
        assertError(() -> mapBrowseService.preview(t.getId(), -1L), ErrorCode.MAP_NOT_FOUND);

        // 지도를 고르면 카드에 myMatchId 와 선택 횟수가 붙는다
        Long matchId = select(t.getId(), b.getId(), b1);
        MapCard selected = mapBrowseService.browse(t.getId(), null, null, null, null, 50).items().stream()
                .filter(c -> c.mapId().equals(b1)).findFirst().orElseThrow();
        assertThat(selected.myMatchId()).isEqualTo(matchId);
        assertThat(selected.selectedCount()).isEqualTo(1);
        assertThat(mapBrowseService.preview(t.getId(), b1).myMatchId()).isEqualTo(matchId);
        assertThat(mapBrowseService.preview(t.getId(), a2).slots().used()).isEqualTo(1);
    }

    @Test
    void 매칭_신청_재검증은_이미_고른_지도_정원_차단을_막는다() {
        User t = traveler(GenderPref.FEMALE, 40);
        User m = user("KR", Gender.FEMALE, 1984);
        Long p = map(m, "고를 지도", 5, 2);
        Long q = map(m, "비공개 지도", 4, 2);
        Long p2 = map(m, "같은 메이트 다른 지도", 6, 2);

        assertThat(selectability.requireSelectable(userRepository.findById(t.getId()).orElseThrow(),
                pref(t), p).getId()).isEqualTo(p);
        assertError(() -> selectability.requireSelectable(t, pref(t), q), ErrorCode.MAP_NOT_AVAILABLE);
        assertError(() -> selectability.requireSelectable(t, pref(t), -1L), ErrorCode.MAP_NOT_FOUND);

        select(t.getId(), m.getId(), p);
        assertError(() -> selectability.requireSelectable(t, pref(t), p), ErrorCode.MAP_ALREADY_SELECTED);
        assertThat(selectability.requireSelectable(t, pref(t), p2).getId()).isEqualTo(p2);   // 같은 메이트의 다른 지도는 OK

        // 정원 10건이 찬 메이트: 고를 수 없고 목록에서도 빠진다
        User full = user("KR", Gender.FEMALE, 1983);
        Long r = map(full, "정원 찬 메이트 지도", 5, 2);
        for (int i = 0; i < 10; i++) select(UUID.randomUUID(), full.getId(), r);
        assertError(() -> selectability.requireSelectable(t, pref(t), r), ErrorCode.MATE_FULL);

        // 차단한 메이트
        User blocked = user("KR", Gender.FEMALE, 1985);
        Long s = map(blocked, "차단한 메이트 지도", 5, 2);
        blockRepository.save(Block.of(t.getId(), blocked.getId(), null, ReportReason.ABUSIVE, null, now));
        assertError(() -> selectability.requireSelectable(t, pref(t), s), ErrorCode.MAP_NOT_AVAILABLE);

        assertThat(ids(mapBrowseService.browse(t.getId(), null, null, null, null, 50)))
                .contains(p, p2).doesNotContain(q, r, s);
    }

    @Test
    void 조건에_맞는_메이트가_없으면_NO_MATE() {
        User t = traveler(GenderPref.FEMALE, 20);
        var res = mapBrowseService.browse(t.getId(), null, null, null, null, null);
        assertThat(res.items()).isEmpty();
        assertThat(res.totalCount()).isZero();
        assertThat(res.emptyReason()).isEqualTo(EmptyReason.NO_MATE);
    }

    @Test
    void 일정이_없으면_TRIP_REQUIRED() {
        User t = user("JP", Gender.FEMALE, 2000);
        preferenceRepository.save(MatchPreference.of(t.getId(), GenderPref.MALE, List.of(50)));
        assertError(() -> mapBrowseService.browse(t.getId(), null, null, null, null, null), ErrorCode.TRIP_REQUIRED);
    }

    private MatchPreference pref(User t) {
        return preferenceRepository.findById(t.getId()).orElseThrow();
    }
}
