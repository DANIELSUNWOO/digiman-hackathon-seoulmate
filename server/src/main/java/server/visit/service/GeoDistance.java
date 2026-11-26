package server.visit.service;

/**
 * 두 좌표 사이의 지표면 거리(m). 하버사인 공식.
 * 방문 인증(VISIT-01)에서 "스팟 반경 200m 안인가"를 판단하는 데만 쓰고, 여행자 좌표는 저장하지 않는다.
 */
public final class GeoDistance {

    private static final double EARTH_RADIUS_METERS = 6_371_000d;

    private GeoDistance() {
    }

    public static double meters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public static boolean within(double lat1, double lng1, double lat2, double lng2, double radiusMeters) {
        return meters(lat1, lng1, lat2, lng2) <= radiusMeters;
    }
}
