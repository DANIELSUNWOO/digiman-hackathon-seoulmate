package server.place;

import org.junit.jupiter.api.Test;
import server.global.error.ApiException;
import server.global.error.ErrorCode;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** PLACE-01 장소 검색: 네이버 응답 정리와 에러 처리 (네트워크 없이) */
class PlaceSearchServiceTest {

    private static final PlaceSearchProperties KEYS = new PlaceSearchProperties(null, "id", "secret", 0);

    private static void assertError(Runnable call, ErrorCode code) {
        assertThatThrownBy(call::run).isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getErrorCode()).isEqualTo(code));
    }

    @Test
    void 예전_개발자센터_응답의_강조_태그와_정수_좌표를_정리한다() {
        Map<String, Object> response = Map.of("items", List.of(Map.of(
                "title", "<b>어니언</b> 성수 &amp; 카페",
                "category", "카페,디저트>베이커리",
                "address", "서울특별시 성동구 성수동2가 277-135",
                "roadAddress", "서울특별시 성동구 아차산로9길 8",
                "mapx", "1270582000",
                "mapy", "375447000")));

        var places = PlaceSearchService.parse(response);
        assertThat(places).hasSize(1);
        var p = places.get(0);
        assertThat(p.name()).isEqualTo("어니언 성수 & 카페");
        assertThat(p.address()).isEqualTo("서울특별시 성동구 아차산로9길 8");          // 도로명 우선
        assertThat(p.lat()).isEqualByComparingTo("37.5447000");
        assertThat(p.lng()).isEqualByComparingTo("127.0582000");
        assertThat(p.lat().scale()).isEqualTo(7);                                   // SPOT-01 칸에 맞춤
        assertThat(p.category()).isEqualTo("베이커리");
    }

    @Test
    void 소수_좌표도_받고_도로명이_없으면_지번_주소를_쓴다() {
        Map<String, Object> response = Map.of("items", List.of(Map.of(
                "title", "광장시장", "category", "", "address", "서울특별시 종로구 예지동 6-1",
                "roadAddress", "", "mapx", "126.9997", "mapy", "37.5700")));

        var p = PlaceSearchService.parse(response).get(0);
        assertThat(p.address()).isEqualTo("서울특별시 종로구 예지동 6-1");
        assertThat(p.lat()).isEqualByComparingTo("37.57");
        assertThat(p.category()).isNull();
    }

    @Test
    void 좌표가_없거나_한국_밖이거나_이름이_없으면_뺀다() {
        Map<String, Object> response = Map.of("items", List.of(
                Map.of("title", "좌표 없음", "mapx", "", "mapy", ""),
                Map.of("title", "도쿄", "mapx", "1397670000", "mapy", "356812000"),
                Map.of("title", "<b></b>", "mapx", "1270000000", "mapy", "375000000"),
                Map.of("title", "숫자 아님", "mapx", "abc", "mapy", "375000000"),
                Map.of("title", "정상", "mapx", "1270000000", "mapy", "375000000")));

        assertThat(PlaceSearchService.parse(response)).extracting(PlaceSearchService.Place::name).containsExactly("정상");
        assertThat(PlaceSearchService.parse(null)).isEmpty();
        assertThat(PlaceSearchService.parse(Map.of("errorCode", "SE01"))).isEmpty();
    }

    @Test
    void 검색어는_앞뒤_공백을_지우고_1자에서_50자까지() {
        AtomicReference<String> sent = new AtomicReference<>();
        var service = new PlaceSearchService(q -> { sent.set(q); return Map.of("items", List.of()); }, KEYS);

        assertThat(service.search("  성수 카페 ")).isEmpty();
        assertThat(sent.get()).isEqualTo("성수 카페");
        assertError(() -> service.search(" "), ErrorCode.VALIDATION_ERROR);
        assertError(() -> service.search(null), ErrorCode.VALIDATION_ERROR);
        assertError(() -> service.search("가".repeat(51)), ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void 키가_없거나_네이버_호출이_실패하면_503() {
        var noKey = new PlaceSearchService(q -> Map.of(), new PlaceSearchProperties("hub", " ", "secret", 0));
        assertError(() -> noKey.search("성수"), ErrorCode.PLACE_SEARCH_UNAVAILABLE);

        var failing = new PlaceSearchService(q -> { throw new IllegalStateException("401 Unauthorized"); }, KEYS);
        assertError(() -> failing.search("성수"), ErrorCode.PLACE_SEARCH_UNAVAILABLE);
    }

    @Test
    void 공급자_설정에_따라_주소와_헤더가_바뀐다() {
        var hub = new PlaceSearchProperties(null, "id", "secret", 0);
        assertThat(hub.baseUrl()).isEqualTo("https://naverapihub.apigw.ntruss.com");
        assertThat(hub.path()).isEqualTo("/search/v1/local");
        assertThat(hub.idHeader()).isEqualTo("X-NCP-APIGW-API-KEY-ID");

        var dev = new PlaceSearchProperties(" Developers ", "id", "secret", 0);
        assertThat(dev.baseUrl()).isEqualTo("https://openapi.naver.com");
        assertThat(dev.path()).isEqualTo("/v1/search/local.json");
        assertThat(dev.secretHeader()).isEqualTo("X-Naver-Client-Secret");
        assertThat(dev.timeoutOrDefault()).isEqualTo(5);
    }
}
