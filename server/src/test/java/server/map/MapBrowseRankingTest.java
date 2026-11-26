package server.map;

import org.junit.jupiter.api.Test;
import server.global.error.ApiException;
import server.map.service.MapBrowseRanking;
import server.map.service.MapBrowseRanking.Candidate;
import server.map.service.MapBrowseSort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** MAP-07 정렬·필터·페이지 (순수 계산) */
class MapBrowseRankingTest {

    private static final LocalDateTime T = LocalDateTime.of(2026, 11, 26, 12, 0);
    private static final UUID A = UUID.fromString("00000000-0000-0000-0000-00000000000a");
    private static final UUID B = UUID.fromString("00000000-0000-0000-0000-00000000000b");

    // mapId, mate, 핀, 업데이트, 선택 횟수, 겹치는 취향
    private final Candidate a1 = new Candidate(1L, A, 5, T.minusDays(3), 10, 3);
    private final Candidate a2 = new Candidate(2L, A, 9, T.minusDays(1), 2, 3);
    private final Candidate b1 = new Candidate(3L, B, 7, T, 30, 1);
    private final List<Candidate> all = List.of(a1, a2, b1);

    private static List<Long> ids(List<Candidate> list) {
        return list.stream().map(Candidate::mapId).toList();
    }

    @Test
    void 추천순은_겹치는_취향_수_그다음_최근_업데이트() {
        assertThat(ids(MapBrowseRanking.rank(all, MapBrowseSort.RECOMMENDED, null, null))).containsExactly(2L, 1L, 3L);
        assertThat(ids(MapBrowseRanking.rank(all, null, null, null))).containsExactly(2L, 1L, 3L);
    }

    @Test
    void 핀_적은_순_많은_순_최근_인기() {
        assertThat(ids(MapBrowseRanking.rank(all, MapBrowseSort.PINS_ASC, null, null))).containsExactly(1L, 3L, 2L);
        assertThat(ids(MapBrowseRanking.rank(all, MapBrowseSort.PINS_DESC, null, null))).containsExactly(2L, 3L, 1L);
        assertThat(ids(MapBrowseRanking.rank(all, MapBrowseSort.RECENT, null, null))).containsExactly(3L, 2L, 1L);
        assertThat(ids(MapBrowseRanking.rank(all, MapBrowseSort.POPULAR, null, null))).containsExactly(3L, 1L, 2L);
    }

    @Test
    void 같은_값이면_추천순_다음_mapId() {
        Candidate x = new Candidate(20L, B, 6, T, 0, 0);
        Candidate y = new Candidate(10L, B, 6, T, 0, 0);
        assertThat(ids(MapBrowseRanking.rank(List.of(x, y), MapBrowseSort.PINS_ASC, null, null))).containsExactly(10L, 20L);
    }

    @Test
    void 핀_개수_필터는_지도_하나_기준이고_상한_생략은_제한_없음() {
        assertThat(ids(MapBrowseRanking.rank(all, MapBrowseSort.PINS_ASC, 6, 8))).containsExactly(3L);
        assertThat(ids(MapBrowseRanking.rank(all, MapBrowseSort.PINS_ASC, 7, null))).containsExactly(3L, 2L);
        assertThat(MapBrowseRanking.rank(all, null, 15, null)).isEmpty();
    }

    @Test
    void 페이지와_전체_개수() {
        List<Candidate> ranked = MapBrowseRanking.rank(all, MapBrowseSort.PINS_ASC, null, null);
        var first = MapBrowseRanking.page(ranked, 0, 2);
        assertThat(ids(first.items())).containsExactly(1L, 3L);
        assertThat(first.totalCount()).isEqualTo(3);
        assertThat(first.hasNext()).isTrue();
        var second = MapBrowseRanking.page(ranked, 1, 2);
        assertThat(ids(second.items())).containsExactly(2L);
        assertThat(second.hasNext()).isFalse();
        assertThat(MapBrowseRanking.page(ranked, 5, 2).items()).isEmpty();
    }

    @Test
    void 잘못된_값은_400() {
        assertThatThrownBy(() -> MapBrowseSort.from("TASTE")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> MapBrowseRanking.validatePinRange(4, null, 5)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> MapBrowseRanking.validatePinRange(8, 6, 5)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> MapBrowseRanking.validatePage(-1, 20, 50)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> MapBrowseRanking.validatePage(0, 0, 50)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> MapBrowseRanking.validatePage(0, 51, 50)).isInstanceOf(ApiException.class);
        assertThat(MapBrowseSort.from(" pins_asc ")).isEqualTo(MapBrowseSort.PINS_ASC);
    }
}
