package server.mate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.mate.service.MateRanking;
import server.mate.service.MateRanking.Candidate;
import server.mate.service.MateRanking.MapStat;
import server.mate.service.MateRanking.Ranked;
import server.mate.service.MateSort;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MateRankingTest {

    private static final LocalDateTime T = LocalDateTime.of(2026, 11, 26, 12, 0);
    private static final Set<Long> TRAVELER_TAGS = Set.of(1L, 2L, 3L, 4L);

    // 고정 uuid (동점일 때 mateId 순서 확인용)
    private static final UUID A = UUID.fromString("00000000-0000-0000-0000-00000000000a");
    private static final UUID B = UUID.fromString("00000000-0000-0000-0000-00000000000b");
    private static final UUID C = UUID.fromString("00000000-0000-0000-0000-00000000000c");
    private static final UUID D = UUID.fromString("00000000-0000-0000-0000-00000000000d");

    /**
     * A: 취향 3개 겹침, 지도 5곳·8곳(최대 8), 2일 전 수정, 선택 3회
     * B: 취향 1개 겹침, 지도 12곳, 방금 수정, 선택 24회
     * C: 취향 2개 겹침, 지도 6곳, 5일 전 수정, 선택 0회
     */
    private final List<Candidate> candidates = List.of(
            new Candidate(A, Set.of(1L, 2L, 3L, 9L), List.of(new MapStat(5, T.minusDays(3)), new MapStat(8, T.minusDays(2))), 3),
            new Candidate(B, Set.of(4L, 10L), List.of(new MapStat(12, T)), 24),
            new Candidate(C, Set.of(1L, 2L), List.of(new MapStat(6, T.minusDays(5))), 0)
    );

    private static List<UUID> ids(List<Ranked> ranked) {
        return ranked.stream().map(Ranked::mateId).toList();
    }

    @Test
    @DisplayName("기본(TASTE)은 겹치는 취향 수가 많은 순, 겹친 취향과 카드 값도 채운다")
    void tasteSort() {
        List<Ranked> r = MateRanking.rank(TRAVELER_TAGS, candidates, MateSort.TASTE, null, null);
        assertThat(ids(r)).containsExactly(A, C, B);
        Ranked a = r.get(0);
        assertThat(a.commonTagIds()).containsExactlyInAnyOrder(1L, 2L, 3L);
        assertThat(a.commonTagCount()).isEqualTo(3);
        assertThat(a.pinCount()).isEqualTo(8);                // 가장 큰 지도 기준
        assertThat(a.lastUpdatedAt()).isEqualTo(T.minusDays(2)); // 가장 최근 수정
    }

    @Test
    @DisplayName("PINS 는 가장 큰 지도의 핀 수, RECENT 는 최근 수정, POPULAR 는 선택 횟수 순")
    void otherSorts() {
        assertThat(ids(MateRanking.rank(TRAVELER_TAGS, candidates, MateSort.PINS, null, null))).containsExactly(B, A, C);
        assertThat(ids(MateRanking.rank(TRAVELER_TAGS, candidates, MateSort.RECENT, null, null))).containsExactly(B, A, C);
        assertThat(ids(MateRanking.rank(TRAVELER_TAGS, candidates, MateSort.POPULAR, null, null))).containsExactly(B, A, C);
    }

    @Test
    @DisplayName("핀 필터: 범위 안에 드는 공개 지도가 하나라도 있으면 통과 (A 는 5곳 지도 덕분에 5~6 범위 통과)")
    void pinFilterAnyMap() {
        List<Ranked> r = MateRanking.rank(TRAVELER_TAGS, candidates, MateSort.TASTE, 5, 6);
        assertThat(ids(r)).containsExactly(A, C);
    }

    @Test
    @DisplayName("maxPins 가 없으면 상한 없음 (슬라이더 '20개 이상')")
    void noUpperBound() {
        assertThat(ids(MateRanking.rank(TRAVELER_TAGS, candidates, MateSort.TASTE, 10, null))).containsExactly(B);
    }

    @Test
    @DisplayName("공개 지도가 없는 후보는 제외")
    void excludesWithoutPublicMap() {
        List<Candidate> withEmpty = new ArrayList<>(candidates);
        withEmpty.add(new Candidate(D, Set.of(1L, 2L, 3L, 4L), List.of(), 100));
        assertThat(ids(MateRanking.rank(TRAVELER_TAGS, withEmpty, MateSort.TASTE, null, null))).doesNotContain(D);
    }

    @Test
    @DisplayName("동점이면 취향 일치 수 → 최근 업데이트 → mateId 순으로 항상 같은 순서")
    void deterministicTieBreak() {
        List<Candidate> ties = List.of(
                new Candidate(C, Set.of(1L), List.of(new MapStat(5, T)), 1),
                new Candidate(A, Set.of(1L), List.of(new MapStat(5, T)), 1),
                new Candidate(B, Set.of(1L), List.of(new MapStat(5, T.plusHours(1))), 1)
        );
        assertThat(ids(MateRanking.rank(TRAVELER_TAGS, ties, MateSort.POPULAR, null, null))).containsExactly(B, A, C);
    }

    @Test
    @DisplayName("페이지: 20명씩 자르고 다음 페이지 여부를 알려 준다")
    void paging() {
        List<Ranked> r = MateRanking.rank(TRAVELER_TAGS, candidates, MateSort.TASTE, null, null);
        MateRanking.Page first = MateRanking.page(r, 0, 2);
        assertThat(ids(first.items())).containsExactly(A, C);
        assertThat(first.hasNext()).isTrue();
        MateRanking.Page second = MateRanking.page(r, 1, 2);
        assertThat(ids(second.items())).containsExactly(B);
        assertThat(second.hasNext()).isFalse();
        assertThat(MateRanking.page(r, 5, 2).items()).isEmpty();
    }

    @Test
    @DisplayName("정렬 파라미터: 비어 있으면 TASTE, 대소문자 무시, 모르는 값은 400")
    void sortParam() {
        assertThat(MateSort.from(null)).isEqualTo(MateSort.TASTE);
        assertThat(MateSort.from("pins")).isEqualTo(MateSort.PINS);
        assertThatThrownBy(() -> MateSort.from("LIKES"))
                .satisfies(t -> assertThat(((ApiException) t).getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    @DisplayName("핀 범위 검증: 최소 5 미만이거나 최소 > 최대면 400")
    void pinRangeValidation() {
        assertThatCode(() -> MateRanking.validatePinRange(5, 12, 5)).doesNotThrowAnyException();
        assertThatCode(() -> MateRanking.validatePinRange(null, null, 5)).doesNotThrowAnyException();
        assertThatThrownBy(() -> MateRanking.validatePinRange(3, null, 5)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> MateRanking.validatePinRange(10, 8, 5)).isInstanceOf(ApiException.class);
    }
}
