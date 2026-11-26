package server.visit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import server.global.config.AppProperties;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.visit.service.GeoDistance;
import server.visit.service.VisitLocationVerifier;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class VisitLocationTest {

    // 스팟: 서울시청 앞
    private static final double SPOT_LAT = 37.566300, SPOT_LNG = 126.977900;
    private static final BigDecimal SPOT_LAT_BD = new BigDecimal("37.566300"), SPOT_LNG_BD = new BigDecimal("126.977900");

    private final PolicyProperties policy = new PolicyProperties(20, 10, 5, 2, 0.5, 200, 5, 10, 18);

    private VisitLocationVerifier verifier(boolean demoMode) {
        return new VisitLocationVerifier(policy, new AppProperties(demoMode, null));
    }

    private static ErrorCode codeOf(Throwable t) {
        return ((ApiException) t).getErrorCode();
    }

    @Test
    @DisplayName("같은 좌표의 거리는 0m")
    void samePoint() {
        assertThat(GeoDistance.meters(SPOT_LAT, SPOT_LNG, SPOT_LAT, SPOT_LNG)).isZero();
    }

    @Test
    @DisplayName("위도 0.001도 차이는 약 111m")
    void oneThousandthDegreeLatitude() {
        assertThat(GeoDistance.meters(SPOT_LAT, SPOT_LNG, SPOT_LAT + 0.001, SPOT_LNG)).isCloseTo(111.2, within(0.5));
    }

    @Test
    @DisplayName("서울시청 → 광화문은 약 1.07km")
    void cityHallToGwanghwamun() {
        assertThat(GeoDistance.meters(37.5663, 126.9779, 37.5759, 126.9769)).isCloseTo(1070, within(20.0));
    }

    @Test
    @DisplayName("약 145m 떨어진 곳은 반경 200m 안이라 통과")
    void insideRadius() {
        assertThatCode(() -> verifier(false).verify(SPOT_LAT + 0.0013, SPOT_LNG, SPOT_LAT_BD, SPOT_LNG_BD))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("약 256m 떨어진 곳은 400 OUT_OF_RANGE")
    void outsideRadius() {
        assertThatThrownBy(() -> verifier(false).verify(SPOT_LAT + 0.0023, SPOT_LNG, SPOT_LAT_BD, SPOT_LNG_BD))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.OUT_OF_RANGE));
    }

    @Test
    @DisplayName("좌표가 없으면(위치 권한 거부) 400 LOCATION_REQUIRED")
    void locationRequired() {
        assertThatThrownBy(() -> verifier(false).verify(null, null, SPOT_LAT_BD, SPOT_LNG_BD))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.LOCATION_REQUIRED));
    }

    @Test
    @DisplayName("DEMO_MODE 면 멀리 있어도, 좌표가 없어도 통과")
    void demoModeSkips() {
        assertThatCode(() -> verifier(true).verify(35.1796, 129.0756, SPOT_LAT_BD, SPOT_LNG_BD)) // 부산
                .doesNotThrowAnyException();
        assertThatCode(() -> verifier(true).verify(null, null, SPOT_LAT_BD, SPOT_LNG_BD))
                .doesNotThrowAnyException();
    }
}
