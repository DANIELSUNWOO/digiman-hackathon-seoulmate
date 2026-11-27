package server.place;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;

/**
 * 네이버 지역 검색 호출. 한 번에 최대 5개(네이버 제한), 정확도 순.
 * hub: GET https://naverapihub.apigw.ntruss.com/search/v1/local (X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY)
 * developers: GET https://openapi.naver.com/v1/search/local.json (X-Naver-Client-Id / X-Naver-Client-Secret)
 */
@Component
public class NaverPlaceSearchClient implements PlaceSearchClient {

    static final int DISPLAY = 5;

    private final PlaceSearchProperties props;
    private final RestClient client;

    public NaverPlaceSearchClient(PlaceSearchProperties props) {
        this.props = props;
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(props.timeoutOrDefault()));
        this.client = RestClient.builder().baseUrl(props.baseUrl()).requestFactory(factory).build();
    }

    @Override
    public Map<?, ?> search(String query) {
        return client.get()
                .uri(b -> b.path(props.path())
                        .queryParam("query", query)
                        .queryParam("display", DISPLAY)
                        .queryParam("start", 1)
                        .queryParam("sort", "random")
                        .build())
                .header(props.idHeader(), props.clientId().strip())
                .header(props.secretHeader(), props.clientSecret().strip())
                .retrieve()
                .body(Map.class);
    }
}
