package server.place;

import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;

/**
 * 네이버 지역 검색 호출. 한 번에 최대 5개(네이버 제한), 정확도 순.
 * hub: GET https://naverapihub.apigw.ntruss.com/search/v1/local (X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY)
 * developers: GET https://openapi.naver.com/v1/search/local.json (X-Naver-Client-Id / X-Naver-Client-Secret)
 * NAVER API HUB 는 JSON 을 보내면서 Content-Type 을 text/plain 으로 줄 때가 있어, 글자로 받은 뒤 직접 JSON 으로 읽는다.
 */
@Component
public class NaverPlaceSearchClient implements PlaceSearchClient {

    static final int DISPLAY = 5;
    private static final JsonMapper JSON = JsonMapper.builder().build();

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
        String body = client.get()
                .uri(b -> b.path(props.path())
                        .queryParam("query", query)
                        .queryParam("display", DISPLAY)
                        .queryParam("start", 1)
                        .queryParam("sort", "random")
                        .build())
                .header(props.idHeader(), props.clientId().strip())
                .header(props.secretHeader(), props.clientSecret().strip())
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(String.class);
        return readJson(body);
    }

    /** 응답 글자를 JSON 객체로. JSON 이 아니면 앞부분을 담아 예외 (로그로 원인을 볼 수 있게) */
    static Map<?, ?> readJson(String body) {
        if (body == null || body.isBlank()) throw new IllegalStateException("empty response");
        try {
            return JSON.readValue(body, Map.class);
        } catch (JacksonException e) {
            String head = body.strip();
            throw new IllegalStateException("not JSON: " + (head.length() > 200 ? head.substring(0, 200) + "..." : head));
        }
    }
}
