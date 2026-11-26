package server.mate.service;

import server.global.error.ApiException;
import server.global.error.ErrorCode;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * 메이트 찾기(MATE-01)의 순수 계산. DB 를 모르고 입력만으로 점수·필터·정렬·페이지를 만든다.
 * 목록 조건(성별·연령대·정원·차단·공개 지도 등)은 MateEligibility 가 먼저 거르고, 통과한 후보만 여기로 넘어온다.
 *
 * - 핀 개수는 "지도 하나" 기준: 카드·정렬은 가장 큰 공개 지도, 필터는 범위 안에 드는 공개 지도가 하나라도 있으면 통과
 * - 같은 값이면 취향 일치 수 → 최근 업데이트 → mateId 순으로 정한다 (페이지를 넘겨도 순서가 흔들리지 않게)
 */
public final class MateRanking {

    private MateRanking() {
    }

    /** 공개 지도 하나의 통계 */
    public record MapStat(long spotCount, LocalDateTime updatedAt) {
    }

    /** 목록 조건을 통과한 후보 메이트 */
    public record Candidate(UUID mateId, Set<Long> tagIds, List<MapStat> publicMaps, long selectedCount) {
    }

    /** 점수가 매겨진 메이트 (카드에 그대로 쓰는 값) */
    public record Ranked(UUID mateId, Set<Long> commonTagIds, int commonTagCount,
                         long pinCount, LocalDateTime lastUpdatedAt, long selectedCount) {
    }

    /** 한 페이지 */
    public record Page(List<Ranked> items, int page, boolean hasNext) {
    }

    /** 핀 개수 필터 검증: minPins ≥ 지도 공개 최소 스팟 수, maxPins 가 있으면 minPins ≤ maxPins */
    public static void validatePinRange(Integer minPins, Integer maxPins, int mapMinSpots) {
        int min = minPins == null ? mapMinSpots : minPins;
        if (min < mapMinSpots || (maxPins != null && min > maxPins)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }

    /**
     * @param travelerTagIds 여행자가 고른 취향
     * @param candidates     목록 조건을 통과한 메이트들
     * @param minPins        핀 개수 하한 (null 이면 제한 없음)
     * @param maxPins        핀 개수 상한 (null 이면 제한 없음, 앱 슬라이더 "20개 이상")
     */
    public static List<Ranked> rank(Set<Long> travelerTagIds, Collection<Candidate> candidates,
                                    MateSort sort, Integer minPins, Integer maxPins) {
        return candidates.stream()
                .filter(c -> c.publicMaps() != null && !c.publicMaps().isEmpty())
                .filter(c -> anyMapInRange(c.publicMaps(), minPins, maxPins))
                .map(c -> score(travelerTagIds, c))
                .sorted(comparator(sort == null ? MateSort.TASTE : sort))
                .toList();
    }

    public static Page page(List<Ranked> ranked, int page, int size) {
        if (page < 0 || size <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        int from = (int) Math.min((long) page * size, ranked.size());
        int to = Math.min(from + size, ranked.size());
        return new Page(ranked.subList(from, to), page, to < ranked.size());
    }

    private static boolean anyMapInRange(List<MapStat> maps, Integer minPins, Integer maxPins) {
        return maps.stream().anyMatch(m ->
                (minPins == null || m.spotCount() >= minPins) && (maxPins == null || m.spotCount() <= maxPins));
    }

    private static Ranked score(Set<Long> travelerTagIds, Candidate c) {
        Set<Long> common = new HashSet<>(c.tagIds() == null ? Set.of() : c.tagIds());
        common.retainAll(travelerTagIds == null ? Set.of() : travelerTagIds);
        long pinCount = c.publicMaps().stream().mapToLong(MapStat::spotCount).max().orElse(0);
        LocalDateTime lastUpdated = c.publicMaps().stream()
                .map(MapStat::updatedAt)
                .filter(t -> t != null)
                .max(Comparator.naturalOrder())
                .orElse(null);
        return new Ranked(c.mateId(), Set.copyOf(common), common.size(), pinCount, lastUpdated, c.selectedCount());
    }

    private static Comparator<Ranked> comparator(MateSort sort) {
        Comparator<Ranked> byTaste = Comparator.comparingInt(Ranked::commonTagCount).reversed();
        Comparator<Ranked> byRecent = Comparator.comparing(Ranked::lastUpdatedAt,
                Comparator.nullsLast(Comparator.<LocalDateTime>reverseOrder()));
        Comparator<Ranked> tieBreak = byTaste.thenComparing(byRecent).thenComparing(Ranked::mateId);

        Comparator<Ranked> primary = switch (sort) {
            case TASTE -> byTaste;
            case PINS -> Comparator.comparingLong(Ranked::pinCount).reversed();
            case RECENT -> byRecent;
            case POPULAR -> Comparator.comparingLong(Ranked::selectedCount).reversed();
        };
        return primary.thenComparing(tieBreak);
    }
}
