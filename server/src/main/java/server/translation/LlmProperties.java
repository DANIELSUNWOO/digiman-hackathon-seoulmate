package server.translation;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * AI 번역(LLM) 설정. 키는 server/.env 의 LLM_API_KEY 또는 배포 환경변수로만 넣는다.
 * 키가 비어 있으면 번역을 건너뛰고 *_translated 는 null 로 남는다 (앱은 원문 표시).
 *
 * @param apiKey         OpenAI API 키 (platform.openai.com)
 * @param model          번역에 쓸 모델. 짧은 글 번역이라 소형 모델로 충분하다
 * @param baseUrl        API 주소
 * @param timeoutSeconds 응답을 기다리는 최대 시간
 */
@ConfigurationProperties(prefix = "seoulmate.llm")
public record LlmProperties(String apiKey, String model, String baseUrl, int timeoutSeconds) {

    static final String DEFAULT_MODEL = "gpt-5.4-nano";

    public boolean enabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    /** .env 에 LLM_MODEL= 처럼 빈 값으로 두어도 기본 모델을 쓴다 */
    public String modelOrDefault() {
        return model == null || model.isBlank() ? DEFAULT_MODEL : model.strip();
    }
}
