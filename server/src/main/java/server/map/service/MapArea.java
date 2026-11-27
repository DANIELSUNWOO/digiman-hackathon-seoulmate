package server.map.service;

import java.util.List;

/**
 * [서버 B] 지도의 동네 정하기 (T-11 위쪽 미니 지도의 동네 말풍선, 카드 맨 앞 동네 이름).
 * 메이트가 동네를 따로 고르지 않으므로, 지도 스팟들의 가운데 위치에서 가장 가까운 동네로 정한다.
 * 동네 이름은 V4 취향 태그의 AREA 항목(name_ko)과 같다. 어느 동네에서도 멀면 동네 없음(null).
 */
public final class MapArea {

    /** 이 거리(km)보다 멀면 어느 동네에도 넣지 않는다 */
    static final double MAX_DISTANCE_KM = 3.0;

    /** 동네 중심 좌표 (대략값, 대표 역·거리 기준) */
    record Center(String nameKo, double lat, double lng) {
    }

    static final List<Center> CENTERS = List.of(
            new Center("성수", 37.5445, 127.0557),
            new Center("연남", 37.5617, 126.9247),
            new Center("을지로", 37.5660, 126.9920),
            new Center("망원", 37.5556, 126.9019),
            new Center("익선", 37.5743, 126.9895),
            new Center("한남", 37.5343, 127.0026));

    private MapArea() {
    }

    /** @return 가장 가까운 동네의 한국어 이름, 3km 안에 없으면 null */
    public static String nearest(double lat, double lng) {
        String best = null;
        double bestKm = MAX_DISTANCE_KM;
        for (Center c : CENTERS) {
            double km = distanceKm(lat, lng, c.lat(), c.lng());
            if (km <= bestKm) {
                bestKm = km;
                best = c.nameKo();
            }
        }
        return best;
    }

    /** 두 좌표 사이 거리 (km, 하버사인) */
    static double distanceKm(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * r * Math.asin(Math.sqrt(a));
    }
}
