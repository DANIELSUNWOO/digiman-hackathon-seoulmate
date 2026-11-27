package server.map;

import org.junit.jupiter.api.Test;
import server.map.service.MapArea;

import static org.assertj.core.api.Assertions.assertThat;

/** 지도의 동네 정하기: 스팟 가운데 위치에서 가장 가까운 동네, 3km 밖이면 없음 */
class MapAreaTest {

    @Test
    void 가장_가까운_동네를_고른다() {
        assertThat(MapArea.nearest(37.5431, 127.0480)).isEqualTo("성수");     // 시연 지도 "성수 골목 산책"
        assertThat(MapArea.nearest(37.5575, 126.9152)).isEqualTo("연남");     // "연남·망원 느린 산책" (연남이 더 가깝다)
        assertThat(MapArea.nearest(37.5791, 126.9923)).isEqualTo("익선");     // "한옥 골목과 궁 산책"
        assertThat(MapArea.nearest(37.5219, 126.9822)).isEqualTo("한남");     // "걸어서 보는 한강 야경"
    }

    @Test
    void 어느_동네에서도_멀면_없다() {
        assertThat(MapArea.nearest(37.6584, 127.0618)).isNull();              // 노원
    }
}
