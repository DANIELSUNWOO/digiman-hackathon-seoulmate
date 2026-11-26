package server.translation;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** 번역 요청 문장과 응답 꺼내기 (네트워크 없이) */
class LlmTranslatorTest {

    @Test
    void 응답에서_번역문만_꺼낸다() {
        Map<String, Object> response = Map.of("choices", List.of(
                Map.of("message", Map.of("role", "assistant", "content", "  静かに本を読めるカフェ \n"))));
        assertThat(LlmTranslator.extract(response)).isEqualTo("静かに本を読めるカフェ");
    }

    @Test
    void 비었거나_모양이_다르면_null() {
        assertThat(LlmTranslator.extract(null)).isNull();
        assertThat(LlmTranslator.extract(Map.of("choices", List.of()))).isNull();
        assertThat(LlmTranslator.extract(Map.of("choices", List.of(Map.of("message", Map.of("content", "  ")))))).isNull();
        assertThat(LlmTranslator.extract(Map.of("error", Map.of("message", "invalid key")))).isNull();
    }

    @Test
    void 지시문에_언어_이름이_들어간다() {
        String instruction = LlmTranslator.instruction("ko", "ja");
        assertThat(instruction).contains("from Korean to Japanese").contains("translated text only");
        assertThat(LlmTranslator.languageName("en")).isEqualTo("en");
    }

    @Test
    void 키가_없으면_꺼지고_모델은_빈값이면_기본값() {
        assertThat(new LlmProperties(" ", null, null, 0).enabled()).isFalse();
        assertThat(new LlmProperties("sk-test", "", null, 0).enabled()).isTrue();
        assertThat(new LlmProperties("sk-test", "", null, 0).modelOrDefault()).isEqualTo("gpt-5.4-nano");
        assertThat(new LlmProperties("sk-test", " gpt-x ", null, 0).modelOrDefault()).isEqualTo("gpt-x");
    }
}
