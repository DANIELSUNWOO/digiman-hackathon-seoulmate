package server.translation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * 실제 OpenAI API 로 한 번 번역해 보는 확인용 테스트. 평소에는 건너뛰고(과금 방지),
 * 환경변수 LLM_LIVE_TEST=true 일 때만 server/.env 의 LLM_API_KEY 로 실행한다.
 *
 *   PowerShell: $env:LLM_LIVE_TEST="true"; .\gradlew test --tests "server.translation.LlmLiveTest" --rerun
 *
 * 번역 결과는 build/reports/tests/test/index.html 의 Standard output 에서 볼 수 있다.
 */
@EnabledIfEnvironmentVariable(named = "LLM_LIVE_TEST", matches = "true")
class LlmLiveTest {

    @Test
    void 실제_API로_한국어를_일본어로_번역한다() throws IOException {
        String key = readEnv("LLM_API_KEY");
        assumeTrue(key != null && !key.isBlank(), "server/.env 에 LLM_API_KEY 가 없습니다");
        LlmProperties props = new LlmProperties(key, readEnv("LLM_MODEL"), null, 30);
        LlmTranslator translator = new LlmTranslator(new TranslationConfig().llmRestClient(props), props);

        String ja = translator.translate("창가 자리에서 혼자 오래 있어도 눈치가 안 보여요", "ko", "ja");
        String ko = translator.translate("窓際の席が本当に落ち着きました", "ja", "ko");
        System.out.println("모델: " + props.modelOrDefault());
        System.out.println("ko → ja: " + ja);
        System.out.println("ja → ko: " + ko);

        assertThat(ja).isNotBlank();
        assertThat(ko).isNotBlank();
    }

    /** server/.env 에서 값 하나 읽기 (테스트는 server 폴더에서 실행된다) */
    private static String readEnv(String name) throws IOException {
        Path env = Path.of(".env");
        if (!Files.exists(env)) return null;
        for (String line : Files.readAllLines(env)) {
            String t = line.strip();
            if (t.startsWith("#") || !t.startsWith(name + "=")) continue;
            return t.substring(name.length() + 1).strip();
        }
        return null;
    }
}
