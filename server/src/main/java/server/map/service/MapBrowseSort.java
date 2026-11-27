package server.map.service;

import server.global.error.ApiException;
import server.global.error.ErrorCode;

/** 지도 고르기(MAP-07) 정렬 기준 (T-11d). 파라미터를 생략하면 추천순 */
public enum MapBrowseSort {
    /** 겹치는 취향 수가 많은 순 (기본) */
    RECOMMENDED,
    /** 핀 적은 순 */
    PINS_ASC,
    /** 핀 많은 순 */
    PINS_DESC,
    /** 최근 업데이트 순 */
    RECENT,
    /** 이 지도가 코스로 선택된 누적 횟수가 많은 순 */
    POPULAR;

    /** 쿼리 파라미터 → enum. 비어 있으면 RECOMMENDED, 모르는 값이면 400 VALIDATION_ERROR */
    public static MapBrowseSort from(String value) {
        if (value == null || value.isBlank()) {
            return RECOMMENDED;
        }
        try {
            return MapBrowseSort.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }
}
