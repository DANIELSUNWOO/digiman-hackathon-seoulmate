package server.map.service;

import server.global.error.ApiException;
import server.global.error.ErrorCode;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * 지도 고르기(MAP-07)의 순수 계산. DB 를 모르고 입력만으로 필터·정렬·페이지를 만든다.
 * 어떤 지도가 후보가 되는지(공개 조건, 메이트 목록 조건, 내가 고른 지도)는 MapBrowseService 가 먼저 정한다.
 *
 * - 핀 개수 = 그 지도의 스팟 수, 필터도 지도 하나 기준
 * - 같은 값이면 겹치는 취향 수 → 최근 업데이트 → mapId 순으로 정한다 (페이지를 넘겨도 순서가 흔들리지 않게)
 */
public final class MapBrowseRanking {

    private MapBrowseRanking() {
    }

    /** 카드 후보 지도 하나 */
    public record Candidate(Long mapId, UUID mateId, long pinCount, LocalDateTime updatedAt,
                            long selectedCount, int commonTagCount) {
    }

    /** 한 페이지 + 필터를 적용한 전체 개수 */
    public record Page(List<Candidate> items, long totalCount, int page, boolean hasNext) {
    }

    /** 핀 개수 필터 검증: minPins ≥ 지도 공개 최소 스팟 수, maxPins 가 있으면 minPins ≤ maxPins */
    public static void validatePinRange(Integer minPins, Integer maxPins, int mapMinSpots) {
        int min = minPins == null ? mapMinSpots : minPins;
        if (min < mapMinSpots || (maxPins != null && min > maxPins)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }

    /** 페이지 값 검증: page ≥ 0, size 1 ~ maxSize */
    public static void validatePage(int page, int size, int maxSize) {
        if (page < 0 || size <= 0 || size > maxSize) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }

    /**
     * @param minPins 핀 개수 하한 (null 이면 제한 없음)
     * @param maxPins 핀 개수 상한 (null 이면 제한 없음, 앱 슬라이더 "20+")
     */
    public static List<Candidate> rank(Collection<Candidate> candidates, MapBrowseSort sort,
                                       Integer minPins, Integer maxPins) {
        return candidates.stream()
                .filter(c -> (minPins == null || c.pinCount() >= minPins) && (maxPins == null || c.pinCount() <= maxPins))
                .sorted(comparator(sort == null ? MapBrowseSort.RECOMMENDED : sort))
                .toList();
    }

    public static Page page(List<Candidate> ranked, int page, int size) {
        int from = (int) Math.min((long) page * size, ranked.size());
        int to = Math.min(from + size, ranked.size());
        return new Page(ranked.subList(from, to), ranked.size(), page, to < ranked.size());
    }

    private static Comparator<Candidate> comparator(MapBrowseSort sort) {
        Comparator<Candidate> byTaste = Comparator.comparingInt(Candidate::commonTagCount).reversed();
        Comparator<Candidate> byRecent = Comparator.comparing(Candidate::updatedAt,
                Comparator.nullsLast(Comparator.<LocalDateTime>reverseOrder()));
        Comparator<Candidate> tieBreak = byTaste.thenComparing(byRecent).thenComparing(Candidate::mapId);

        Comparator<Candidate> primary = switch (sort) {
            case RECOMMENDED -> byTaste;
            case PINS_ASC -> Comparator.comparingLong(Candidate::pinCount);
            case PINS_DESC -> Comparator.comparingLong(Candidate::pinCount).reversed();
            case RECENT -> byRecent;
            case POPULAR -> Comparator.comparingLong(Candidate::selectedCount).reversed();
        };
        return primary.thenComparing(tieBreak);
    }
}
