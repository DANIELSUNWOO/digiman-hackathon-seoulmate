package server.place;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** NAVER API HUB 가 JSON 을 text/plain 으로 보내도 읽는다 (네트워크 없이) */
class NaverPlaceSearchClientTest {

    @Test
    void 글자로_받은_JSON_을_읽어서_결과로_정리한다() {
        String body = """
                {"lastBuildDate":"Fri, 27 Nov 2026 17:11:45 +0900","total":1,"start":1,"display":1,
                 "items":[{"title":"<b>성수</b> 카페","link":"","category":"카페,디저트>카페",
                           "description":"","telephone":"","address":"서울특별시 성동구 성수동2가 1",
                           "roadAddress":"서울특별시 성동구 아차산로 1","mapx":"1270558000","mapy":"375446000"}]}
                """;
        var json = NaverPlaceSearchClient.readJson(body);
        assertThat(json.get("items")).isInstanceOf(List.class);

        var places = PlaceSearchService.parse(json);
        assertThat(places).hasSize(1);
        assertThat(places.get(0).name()).isEqualTo("성수 카페");
        assertThat(places.get(0).lat()).isEqualByComparingTo("37.5446");
    }

    @Test
    void JSON_이_아니거나_비었으면_앞부분을_담아_실패한다() {
        assertThatThrownBy(() -> NaverPlaceSearchClient.readJson("Unauthorized: invalid key"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not JSON: Unauthorized");
        assertThatThrownBy(() -> NaverPlaceSearchClient.readJson("x".repeat(500)))
                .hasMessageEndingWith("...");
        assertThatThrownBy(() -> NaverPlaceSearchClient.readJson(" "))
                .hasMessage("empty response");
    }
}
