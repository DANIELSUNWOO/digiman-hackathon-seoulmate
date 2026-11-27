package server.place;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 장소 검색(네이버 지역 검색) 설정. 키는 server/.env 또는 배포 환경변수로만 넣는다. 앱에는 절대 넣지 않는다.
 * 키가 비어 있으면 PLACE-01 은 503 PLACE_SEARCH_UNAVAILABLE.
 *
 * @param provider       hub = NAVER API HUB (네이버 클라우드 콘솔에서 발급, 2026 신규) /
 *                       developers = 예전 네이버 개발자센터 키 (openapi.naver.com)
 * @param clientId       Client ID
 * @param clientSecret   Client Secret
 * @param timeoutSeconds 응답을 기다리는 최대 시간
 */
@ConfigurationProperties(prefix = "seoulmate.place-search")
public record PlaceSearchProperties(String provider, String clientId, String clientSecret, int timeoutSeconds) {

    public boolean enabled() {
        return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
    }

    public boolean developers() {
        return "developers".equalsIgnoreCase(provider == null ? "" : provider.strip());
    }

    String baseUrl() {
        return developers() ? "https://openapi.naver.com" : "https://naverapihub.apigw.ntruss.com";
    }

    String path() {
        return developers() ? "/v1/search/local.json" : "/search/v1/local";
    }

    String idHeader() {
        return developers() ? "X-Naver-Client-Id" : "X-NCP-APIGW-API-KEY-ID";
    }

    String secretHeader() {
        return developers() ? "X-Naver-Client-Secret" : "X-NCP-APIGW-API-KEY";
    }

    int timeoutOrDefault() {
        return timeoutSeconds > 0 ? timeoutSeconds : 5;
    }
}
