package server.place;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import server.global.error.ApiException;
import server.global.error.ErrorCode;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * [서버 B] PLACE-01 장소 검색. 메이트가 스팟을 등록할 때(SPOT-01) 장소 이름으로 찾아 주소·좌표를 채운다.
 * 검색 키는 서버에만 있고, 앱은 고른 결과의 name·address·lat·lng 를 그대로 SPOT-01 에 넣는다.
 */
@Slf4j
@Service
public class PlaceSearchService {

    static final int MAX_QUERY = 50;
    /** 한국 안의 좌표만 쓴다 (값이 이상한 결과는 버림) */
    private static final BigDecimal LAT_MIN = new BigDecimal("33"), LAT_MAX = new BigDecimal("39");
    private static final BigDecimal LNG_MIN = new BigDecimal("124"), LNG_MAX = new BigDecimal("132");

    private final PlaceSearchClient client;
    private final PlaceSearchProperties props;

    public PlaceSearchService(PlaceSearchClient client, PlaceSearchProperties props) {
        this.client = client;
        this.props = props;
    }

    public List<Place> search(String query) {
        String q = query == null ? "" : query.strip();
        if (q.isEmpty() || q.length() > MAX_QUERY) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (!props.enabled()) throw new ApiException(ErrorCode.PLACE_SEARCH_UNAVAILABLE);
        Map<?, ?> response;
        try {
            response = client.search(q);
        } catch (Exception e) {
            // 키 오류(401), 하루 한도 초과, 시간 초과 등. 앱은 "잠시 후 다시" 안내
            log.warn("place search failed: {}", e.getMessage());
            throw new ApiException(ErrorCode.PLACE_SEARCH_UNAVAILABLE);
        }
        return parse(response);
    }

    /** 네이버 응답 → 앱에 줄 목록. 좌표가 없거나 한국 밖이면 뺀다 */
    static List<Place> parse(Map<?, ?> response) {
        List<Place> out = new ArrayList<>();
        if (response == null || !(response.get("items") instanceof List<?> items)) return out;
        for (Object o : items) {
            if (!(o instanceof Map<?, ?> item)) continue;
            String name = clean(str(item.get("title")));
            BigDecimal lng = coord(str(item.get("mapx")));
            BigDecimal lat = coord(str(item.get("mapy")));
            if (name.isEmpty() || lat == null || lng == null) continue;
            if (lat.compareTo(LAT_MIN) < 0 || lat.compareTo(LAT_MAX) > 0
                    || lng.compareTo(LNG_MIN) < 0 || lng.compareTo(LNG_MAX) > 0) continue;
            String road = clean(str(item.get("roadAddress")));
            String jibun = clean(str(item.get("address")));
            out.add(new Place(name, road.isEmpty() ? (jibun.isEmpty() ? null : jibun) : road, lat, lng,
                    blankToNull(lastCategory(clean(str(item.get("category")))))));
        }
        return out;
    }

    /**
     * 네이버 좌표: WGS84. 예전 개발자센터 응답은 경위도 × 10^7 정수("1270558000"), 소수로 오면 그대로 쓴다.
     * SPOT-01 칸에 맞게 소수 7자리.
     */
    static BigDecimal coord(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            BigDecimal v = new BigDecimal(raw.strip());
            if (v.abs().compareTo(new BigDecimal("1000")) > 0) v = v.movePointLeft(7);
            return v.setScale(7, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** 검색어 강조 태그(<b>)와 HTML 엔티티를 지운다 */
    static String clean(String s) {
        if (s == null) return "";
        return s.replaceAll("<[^>]*>", "")
                .replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"")
                .replace("&#39;", "'").replace("&apos;", "'").replace("&amp;", "&")
                .strip();
    }

    /** "카페,디저트>베이커리" → "베이커리" (가장 좁은 분류) */
    static String lastCategory(String category) {
        if (category.isEmpty()) return category;
        String[] parts = category.split("[>,]");
        return parts[parts.length - 1].strip();
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    /** @param address 도로명 주소 (없으면 지번 주소) */
    public record Place(String name, String address, BigDecimal lat, BigDecimal lng, String category) {}
}
