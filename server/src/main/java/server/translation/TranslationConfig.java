package server.translation;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class TranslationConfig {

    /** 번역 전용 스레드. 쪽지 전송·글 저장 요청이 LLM 응답을 기다리지 않게 한다 */
    @Bean(name = "translationExecutor")
    public ThreadPoolTaskExecutor translationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("translate-");
        return executor;
    }

    @Bean(name = "llmRestClient")
    public RestClient llmRestClient(LlmProperties props) {
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(props.timeoutSeconds() > 0 ? props.timeoutSeconds() : 20));
        return RestClient.builder()
                .baseUrl(props.baseUrl() == null || props.baseUrl().isBlank() ? "https://api.openai.com/v1" : props.baseUrl())
                .requestFactory(factory)
                .build();
    }
}
