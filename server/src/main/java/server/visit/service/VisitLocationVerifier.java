package server.visit.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import server.global.config.AppProperties;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;

import java.math.BigDecimal;

/**
 * 방문 인증 위치 확인 (VISIT-01, F-26).
 * - 앱이 보낸 좌표가 없으면 400 LOCATION_REQUIRED (위치 권한 거부)
 * - 스팟 반경(policy.visit-radius-meters, 기본 200m) 밖이면 400 OUT_OF_RANGE
 * - DEMO_MODE=true 면 거리 확인을 건너뛴다 (발표장이 서울이 아니어도 시연 가능)
 * 좌표는 거리 계산에만 쓰고 어디에도 저장하지 않는다.
 */
@Component
@RequiredArgsConstructor
public class VisitLocationVerifier {

    private final PolicyProperties policy;
    private final AppProperties app;

    public void verify(Double travelerLat, Double travelerLng, BigDecimal spotLat, BigDecimal spotLng) {
        if (app.demoMode()) {
            return;
        }
        if (travelerLat == null || travelerLng == null) {
            throw new ApiException(ErrorCode.LOCATION_REQUIRED);
        }
        boolean inside = GeoDistance.within(travelerLat, travelerLng,
                spotLat.doubleValue(), spotLng.doubleValue(), policy.visitRadiusMeters());
        if (!inside) {
            throw new ApiException(ErrorCode.OUT_OF_RANGE);
        }
    }
}
