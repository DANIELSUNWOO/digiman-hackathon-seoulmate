package server.map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;
import server.map.domain.Spot;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.map.service.MapService;
import server.map.service.MapService.MapPatch;
import server.map.service.MapService.MapRequest;
import server.map.service.MapService.SpotPatch;
import server.map.service.MapService.SpotRequest;
import server.match.domain.Match;
import server.match.repository.MatchRepository;
import server.trip.domain.Trip;
import server.trip.repository.TripRepository;
import server.user.domain.Gender;
import server.user.domain.User;
import server.user.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** MAP-01~06, SPOT-01~03 통합 테스트 (H2) */
@SpringBootTest
@ActiveProfiles("test")
class MapServiceIntegrationTest {

    @Autowired MapService mapService;
    @Autowired UserRepository userRepository;
    @Autowired TripRepository tripRepository;
    @Autowired MatchRepository matchRepository;
    @Autowired SecretMapRepository mapRepository;
    @Autowired SpotRepository spotRepository;

    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
    private final LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

    private User user(String country, boolean verified) {
        User u = User.register(UUID.randomUUID(), country, 5, now);
        u.registerProfile((country + UUID.randomUUID()).substring(0, 12), Gender.MALE, 1995, null, null);
        if (verified) u.verify();
        return userRepository.save(u);
    }

    private static AuthUser auth(User u) {
        return new AuthUser(u.getId(), u.getRole(), null);
    }

    private static SpotRequest spot(String name, List<String> photos) {
        return new SpotRequest(name, "서울 성동구", new BigDecimal("37.5447000"), new BigDecimal("127.0582000"),
                null, photos, "추천 이유", "후기");
    }

    private static SpotRequest spot(String name) {
        return spot(name, List.of("https://img/" + name + ".jpg"));
    }

    /** 스팟 n곳짜리 지도를 만들고 스팟 id 를 돌려준다 */
    private List<Long> mapWithSpots(AuthUser me, Long mapId, int n) {
        List<Long> ids = new ArrayList<>();
        for (int i = 0; i < n; i++) ids.add(mapService.addSpot(me, mapId, spot("스팟" + i)).spotId());
        return ids;
    }

    private static void assertError(Runnable call, ErrorCode code) {
        assertThatThrownBy(call::run).isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode()).isEqualTo(code);
    }

    @Test
    void 스팟_5곳과_공개_스팟_2곳을_채우면_공개된다() {
        AuthUser me = auth(user("KR", true));
        Long mapId = mapService.createMap(me, new MapRequest(" 성수 골목 ", "제가 자주 가는 곳")).mapId();

        List<Long> spotIds = mapWithSpots(me, mapId, 4);
        var fifth = mapService.addSpot(me, mapId, spot("스팟4"));
        assertThat(fifth.spotCount()).isEqualTo(5);
        assertThat(fifth.isPublic()).isFalse();                 // 공개 스팟을 아직 안 골랐다
        spotIds.add(fifth.spotId());

        var previews = mapService.setPreviews(me, mapId, List.of(spotIds.get(0), spotIds.get(3)));
        assertThat(previews.isPublic()).isTrue();

        var mine = mapService.myMaps(me);
        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).title()).isEqualTo("성수 골목");
        assertThat(mine.get(0).spotCount()).isEqualTo(5);
        assertThat(mine.get(0).previewCount()).isEqualTo(2);
        assertThat(mine.get(0).isPublic()).isTrue();
        assertThat(mine.get(0).inUse()).isFalse();

        var detail = mapService.detail(me, mapId);
        assertThat(detail.spots()).hasSize(5);
        assertThat(detail.spots().get(0).photos()).containsExactly("https://img/스팟0.jpg");
        assertThat(detail.spots().stream().filter(MapService.SpotView::isPreview).map(MapService.SpotView::spotId))
                .containsExactlyInAnyOrder(spotIds.get(0), spotIds.get(3));
        assertThat(detail.caption().original()).isEqualTo("제가 자주 가는 곳");
        assertThat(detail.caption().sourceLang()).isEqualTo("ko");

        // 공개 스팟 다시 지정: 기존 2곳은 해제된다
        mapService.setPreviews(me, mapId, List.of(spotIds.get(1), spotIds.get(2)));
        assertThat(spotRepository.findByMapIdAndPreviewTrueOrderBySortOrderAscIdAsc(mapId).stream().map(Spot::getId))
                .containsExactly(spotIds.get(1), spotIds.get(2));

        // 공개 스팟은 수정·삭제 불가 → 다른 곳을 공개로 바꾸면(노출 해제) 고칠 수 있고, 다시 공개로 지정한다
        assertError(() -> mapService.editSpot(me, spotIds.get(1),
                new SpotPatch("새 이름", null, null, null, null, null, null, null)), ErrorCode.PREVIEW_SPOT_LOCKED);
        assertError(() -> mapService.deleteSpot(me, spotIds.get(1)), ErrorCode.PREVIEW_SPOT_LOCKED);
        mapService.setPreviews(me, mapId, List.of(spotIds.get(0), spotIds.get(2)));
        assertThat(mapService.editSpot(me, spotIds.get(1),
                new SpotPatch("새 이름", null, null, null, null, null, null, null)).name()).isEqualTo("새 이름");
        assertThat(mapService.setPreviews(me, mapId, List.of(spotIds.get(1), spotIds.get(2))).isPublic()).isTrue();
    }

    @Test
    void 여권_인증_전_메이트는_지도를_만들_수_없다() {
        AuthUser me = auth(user("KR", false));
        assertError(() -> mapService.createMap(me, new MapRequest("지도", null)), ErrorCode.NOT_VERIFIED);
    }

    @Test
    void 사진은_1장에서_3장까지() {
        AuthUser me = auth(user("KR", true));
        Long mapId = mapService.createMap(me, new MapRequest("지도", null)).mapId();

        assertError(() -> mapService.addSpot(me, mapId, spot("사진없음", List.of())), ErrorCode.PHOTO_REQUIRED);
        assertError(() -> mapService.addSpot(me, mapId, spot("빈값", List.of(" "))), ErrorCode.PHOTO_REQUIRED);
        List<String> four = IntStream.range(0, 4).mapToObj(i -> "https://img/" + i + ".jpg").toList();
        assertError(() -> mapService.addSpot(me, mapId, spot("네장", four)), ErrorCode.VALIDATION_ERROR);

        var created = mapService.addSpot(me, mapId, spot("세장", four.subList(0, 3)));
        assertThat(mapService.detail(me, mapId).spots().get(0).photos()).hasSize(3);

        // 수정: 사진을 보내면 통째로 바뀌고, 빈 목록은 안 된다
        var edited = mapService.editSpot(me, created.spotId(),
                new SpotPatch(null, null, null, null, null, List.of("https://img/new.jpg"), null, null));
        assertThat(edited.photos()).containsExactly("https://img/new.jpg");
        assertError(() -> mapService.editSpot(me, created.spotId(),
                new SpotPatch(null, null, null, null, null, List.of(), null, null)), ErrorCode.PHOTO_REQUIRED);
    }

    @Test
    void 공개_스팟은_정확히_2곳이고_이_지도의_스팟이어야_한다() {
        AuthUser me = auth(user("KR", true));
        Long mapId = mapService.createMap(me, new MapRequest("지도", null)).mapId();
        List<Long> ids = mapWithSpots(me, mapId, 5);
        Long otherMap = mapService.createMap(me, new MapRequest("다른 지도", null)).mapId();
        Long otherSpot = mapWithSpots(me, otherMap, 1).get(0);

        assertError(() -> mapService.setPreviews(me, mapId, List.of(ids.get(0))), ErrorCode.PREVIEW_COUNT_INVALID);
        assertError(() -> mapService.setPreviews(me, mapId, List.of(ids.get(0), ids.get(0))), ErrorCode.PREVIEW_COUNT_INVALID);
        assertError(() -> mapService.setPreviews(me, mapId, ids.subList(0, 3)), ErrorCode.PREVIEW_COUNT_INVALID);
        assertError(() -> mapService.setPreviews(me, mapId, List.of(ids.get(0), otherSpot)), ErrorCode.SPOT_NOT_IN_MAP);
    }

    @Test
    void 남의_지도와_스팟은_건드릴_수_없다() {
        AuthUser owner = auth(user("KR", true));
        AuthUser other = auth(user("KR", true));
        Long mapId = mapService.createMap(owner, new MapRequest("지도", null)).mapId();
        Long spotId = mapWithSpots(owner, mapId, 1).get(0);

        assertError(() -> mapService.detail(other, mapId), ErrorCode.NOT_MAP_OWNER);
        assertError(() -> mapService.addSpot(other, mapId, spot("x")), ErrorCode.NOT_MAP_OWNER);
        assertError(() -> mapService.deleteSpot(other, spotId), ErrorCode.NOT_MAP_OWNER);
        assertError(() -> mapService.deleteMap(other, mapId), ErrorCode.NOT_MAP_OWNER);
        assertError(() -> mapService.detail(owner, -1L), ErrorCode.MAP_NOT_FOUND);
        assertError(() -> mapService.deleteSpot(owner, -1L), ErrorCode.SPOT_NOT_FOUND);
    }

    @Test
    void 글을_고치면_번역을_비우고_보낸_값만_바뀐다() {
        AuthUser me = auth(user("KR", true));
        Long mapId = mapService.createMap(me, new MapRequest("지도", null)).mapId();
        Long spotId = mapWithSpots(me, mapId, 1).get(0);

        Spot saved = spotRepository.findById(spotId).orElseThrow();
        saved.fillReasonTranslation("おすすめ理由");
        saved.fillReviewTranslation("レビュー");
        spotRepository.save(saved);

        var edited = mapService.editSpot(me, spotId,
                new SpotPatch(" 새 이름 ", null, null, null, null, null, "새 추천 이유", null));
        assertThat(edited.name()).isEqualTo("새 이름");
        assertThat(edited.address()).isEqualTo("서울 성동구");          // 안 보낸 값은 그대로
        assertThat(edited.reason().original()).isEqualTo("새 추천 이유");
        assertThat(edited.reason().translated()).isNull();             // 바뀐 글은 다시 번역
        assertThat(edited.review().translated()).isEqualTo("レビュー");  // 안 바뀐 글은 번역 유지
        assertThat(edited.photos()).hasSize(1);
    }

    @Test
    void 여행_중에는_새_스팟_추가만_되고_끝나도_지도_삭제는_막는다() {
        User mate = user("KR", true);
        AuthUser me = auth(mate);
        Long mapId = mapService.createMap(me, new MapRequest("코스 지도", null)).mapId();
        List<Long> spotIds = mapWithSpots(me, mapId, 5);
        mapService.setPreviews(me, mapId, List.of(spotIds.get(0), spotIds.get(1)));

        User traveler = user("JP", true);
        Trip trip = tripRepository.save(Trip.of(traveler.getId(), today, today.plusDays(3), now));
        Match match = Match.create(trip.getId(), traveler.getId(), mate.getId(), mapId, 3, now);
        match = matchRepository.save(match);

        var traveling = mapService.myMaps(me).get(0);
        assertThat(traveling.inUse()).isTrue();
        assertThat(traveling.travelingCount()).isEqualTo(1);
        assertThat(traveling.selectedCount()).isEqualTo(1);

        // 여행 중: 기존 스팟·지도 이름·공개 스팟 지정은 잠기고, 새 스팟 추가만 된다
        SpotPatch rename = new SpotPatch("새 이름", null, null, null, null, null, null, null);
        assertError(() -> mapService.editSpot(me, spotIds.get(3), rename), ErrorCode.MAP_LOCKED);
        assertError(() -> mapService.deleteSpot(me, spotIds.get(3)), ErrorCode.MAP_LOCKED);
        assertError(() -> mapService.editMap(me, mapId, new MapPatch("새 지도 이름", null)), ErrorCode.MAP_LOCKED);
        assertError(() -> mapService.setPreviews(me, mapId, List.of(spotIds.get(2), spotIds.get(3))), ErrorCode.MAP_LOCKED);
        assertError(() -> mapService.deleteMap(me, mapId), ErrorCode.MAP_IN_USE);
        assertThat(mapService.addSpot(me, mapId, spot("새 장소")).spotCount()).isEqualTo(6);

        // 여행이 끝나면 잠금이 풀린다. 단, matches.course_map_id 가 지도를 가리키므로 지도 삭제는 계속 막는다
        match.cancel(match.getTravelerId(), null, null, now);
        matchRepository.save(match);
        var ended = mapService.myMaps(me).get(0);
        assertThat(ended.inUse()).isFalse();
        assertThat(ended.travelingCount()).isZero();
        assertThat(ended.selectedCount()).isEqualTo(1);
        assertThat(mapService.editSpot(me, spotIds.get(3), rename).name()).isEqualTo("새 이름");
        mapService.deleteSpot(me, spotIds.get(3));
        assertThat(spotRepository.countByMapId(mapId)).isEqualTo(5);
        assertError(() -> mapService.deleteMap(me, mapId), ErrorCode.MAP_IN_USE);
    }

    @Test
    void 쓰인_적_없는_지도는_스팟째_삭제된다() {
        AuthUser me = auth(user("KR", true));
        Long mapId = mapService.createMap(me, new MapRequest("지울 지도", null)).mapId();
        mapWithSpots(me, mapId, 3);

        mapService.deleteMap(me, mapId);

        assertThat(mapRepository.findById(mapId)).isEmpty();
        assertThat(spotRepository.countByMapId(mapId)).isZero();
        assertThat(mapService.myMaps(me)).isEmpty();
    }

    @Test
    void 공백_이름과_너무_긴_사진_주소는_400() {
        AuthUser me = auth(user("KR", true));
        Long mapId = mapService.createMap(me, new MapRequest("지도", null)).mapId();
        Long spotId = mapWithSpots(me, mapId, 1).get(0);
        String longUrl = "https://img/" + "a".repeat(489);   // 501자

        assertError(() -> mapService.editSpot(me, spotId,
                new SpotPatch("   ", null, null, null, null, null, null, null)), ErrorCode.VALIDATION_ERROR);
        assertError(() -> mapService.addSpot(me, mapId, spot("긴주소", List.of(longUrl))), ErrorCode.VALIDATION_ERROR);
        assertError(() -> mapService.editSpot(me, spotId,
                new SpotPatch(null, null, null, null, null, List.of(longUrl), null, null)), ErrorCode.VALIDATION_ERROR);
        assertThat(mapService.detail(me, mapId).spots().get(0).name()).isEqualTo("스팟0");
    }
}
