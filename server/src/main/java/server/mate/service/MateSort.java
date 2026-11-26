package server.mate.service;

import server.global.error.ApiException;
import server.global.error.ErrorCode;

/** 메이트 찾기(MATE-01) 정렬 기준. 기본은 취향 일치순 */
public enum MateSort {
    /** 겹치는 취향 수가 많은 순 */
    TASTE,
    /** 가장 큰 공개 지도의 스팟 수가 많은 순 */
    PINS,
    /** 공개 지도가 최근에 수정된 순 */
    RECENT,
    /** 지도가 코스로 선택된 누적 횟수가 많은 순 */
    POPULAR;

    /** 쿼리 파라미터 → enum. 비어 있으면 TASTE, 모르는 값이면 400 VALIDATION_ERROR */
    public static MateSort from(String value) {
        if (value == null || value.isBlank()) {
            return TASTE;
        }
        try {
            return MateSort.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }
}
