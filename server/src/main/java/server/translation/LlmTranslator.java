package server.translation;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * OpenAI Chat Completions 로 한 건을 번역한다. 실패하면 예외를 던지고, 호출한 쪽이 로그만 남긴다.
 * 요청 형식: POST {baseUrl}/chat/completions, Authorization: Bearer {key}
 */
@Component
public class LlmTranslator {

    private final RestClient client;
    private final LlmProperties props;

    public LlmTranslator(@Qualifier("llmRestClient") RestClient client, LlmProperties props) {
        this.client = client;
        this.props = props;
    }

    public boolean enabled() {
        return props.enabled();
    }

    /** @return 번역문. 모델이 빈 응답을 주면 null */
    public String translate(String text, String sourceLang, String targetLang) {
        Map<String, Object> body = Map.of(
                "model", props.modelOrDefault(),
                "messages", List.of(
                        Map.of("role", "system", "content", instruction(sourceLang, targetLang)),
                        Map.of("role", "user", "content", text)));
        Map<?, ?> response = client.post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + props.apiKey().strip())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);
        return extract(response);
    }

    /** 번역 지시문. 결과만 돌려받도록 한다 */
    static String instruction(String sourceLang, String targetLang) {
        return "You translate short texts written by users of a Seoul travel app for Korean locals and Japanese travelers. "
                + "Translate the user's message from " + languageName(sourceLang) + " to " + languageName(targetLang) + ". "
                + "Keep the meaning, casual tone, emoji and line breaks. "
                + "Keep place names, store names and addresses as written. "
                + "Reply with the translated text only, without quotes, notes or explanations.";
    }

    /** choices[0].message.content */
    static String extract(Map<?, ?> response) {
        if (response == null || !(response.get("choices") instanceof List<?> choices) || choices.isEmpty()) return null;
        if (!(choices.get(0) instanceof Map<?, ?> choice) || !(choice.get("message") instanceof Map<?, ?> message)) return null;
        if (!(message.get("content") instanceof String content)) return null;
        String trimmed = content.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    static String languageName(String code) {
        return switch (code == null ? "" : code) {
            case "ko" -> "Korean";
            case "ja" -> "Japanese";
            default -> code;
        };
    }
}
