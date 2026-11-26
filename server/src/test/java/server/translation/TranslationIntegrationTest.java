package server.translation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.test.context.ActiveProfiles;
import server.chat.domain.ChatMessage;
import server.chat.repository.ChatMessageRepository;
import server.global.event.TranslationTarget;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.visit.domain.SpotVisit;
import server.visit.domain.VisitReaction;
import server.visit.repository.SpotVisitRepository;
import server.visit.repository.VisitReactionRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 번역 결과 채우기 (H2). 실제 LLM 대신 가짜 번역기를 넣고, 번역 스레드 대신 바로 실행한다.
 */
@SpringBootTest
@ActiveProfiles("test")
class TranslationIntegrationTest {

    @Autowired TranslationWriter writer;
    @Autowired LlmTranslationService realService;
    @Autowired SecretMapRepository mapRepository;
    @Autowired SpotRepository spotRepository;
    @Autowired SpotVisitRepository visitRepository;
    @Autowired VisitReactionRepository reactionRepository;
    @Autowired ChatMessageRepository messageRepository;

    private final LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

    /** 앞에 [ja] 를 붙여 돌려주는 가짜 번역기 */
    private static LlmTranslator fake(boolean fail) {
        return new LlmTranslator(null, new LlmProperties("sk-test", null, null, 0)) {
            @Override
            public String translate(String text, String sourceLang, String targetLang) {
                if (fail) throw new IllegalStateException("401 invalid api key");
                return "[" + targetLang + "] " + text;
            }
        };
    }

    private LlmTranslationService service(boolean fail) {
        return new LlmTranslationService(fake(fail), writer, new SyncTaskExecutor());
    }

    private Spot spot() {
        SecretMap map = mapRepository.save(SecretMap.of(UUID.randomUUID(), "지도", "조용한 카페 모음", now));
        return spotRepository.save(Spot.of(map.getId(), "카페", null, new BigDecimal("37.5447000"),
                new BigDecimal("127.0582000"), null, "창가 자리가 좋아요", "오전에 한적해요", 0));
    }

    @Test
    void 모든_대상의_번역_칸을_채운다() {
        Spot spot = spot();
        SpotVisit visit = visitRepository.save(SpotVisit.of(1L, spot.getId(), "https://img/v.jpg", "窓際の席が最高", now));
        VisitReaction comment = reactionRepository.save(VisitReaction.comment(visit.getId(), UUID.randomUUID(), "거기 최고죠", now));
        ChatMessage message = messageRepository.save(ChatMessage.of(1L, UUID.randomUUID(), "안녕하세요", now));

        LlmTranslationService service = service(false);
        service.translateAsync(TranslationTarget.MAP_CAPTION, spot.getMapId(), "조용한 카페 모음", "ko", "ja");
        service.translateAsync(TranslationTarget.SPOT_REASON, spot.getId(), "창가 자리가 좋아요", "ko", "ja");
        service.translateAsync(TranslationTarget.SPOT_REVIEW, spot.getId(), "오전에 한적해요", "ko", "ja");
        service.translateAsync(TranslationTarget.VISIT_REVIEW, visit.getId(), "窓際の席が最高", "ja", "ko");
        service.translateAsync(TranslationTarget.REACTION_COMMENT, comment.getId(), "거기 최고죠", "ko", "ja");
        service.translateAsync(TranslationTarget.CHAT_MESSAGE, message.getId(), "안녕하세요", "ko", "ja");

        assertThat(mapRepository.findById(spot.getMapId()).orElseThrow().getCaptionTranslated()).isEqualTo("[ja] 조용한 카페 모음");
        Spot saved = spotRepository.findById(spot.getId()).orElseThrow();
        assertThat(saved.getReasonTranslated()).isEqualTo("[ja] 창가 자리가 좋아요");
        assertThat(saved.getReviewTranslated()).isEqualTo("[ja] 오전에 한적해요");
        assertThat(visitRepository.findById(visit.getId()).orElseThrow().getReviewTranslated()).isEqualTo("[ko] 窓際の席が最高");
        assertThat(reactionRepository.findById(comment.getId()).orElseThrow().getCommentTranslated()).isEqualTo("[ja] 거기 최고죠");
        assertThat(messageRepository.findById(message.getId()).orElseThrow().getContentTranslated()).isEqualTo("[ja] 안녕하세요");
    }

    @Test
    void 번역하는_사이_원문이_바뀌었으면_옛_번역으로_덮지_않는다() {
        Spot spot = spot();
        assertThat(writer.fill(TranslationTarget.SPOT_REASON, spot.getId(), "예전 추천 이유", "[ja] 예전")).isFalse();
        assertThat(spotRepository.findById(spot.getId()).orElseThrow().getReasonTranslated()).isNull();
        assertThat(writer.fill(TranslationTarget.SPOT_REASON, -1L, "창가 자리가 좋아요", "x")).isFalse();
    }

    @Test
    void 번역이_실패하면_칸은_null_로_두고_예외를_밖으로_내지_않는다() {
        Spot spot = spot();
        service(true).translateAsync(TranslationTarget.SPOT_REASON, spot.getId(), "창가 자리가 좋아요", "ko", "ja");
        assertThat(spotRepository.findById(spot.getId()).orElseThrow().getReasonTranslated()).isNull();
    }

    @Test
    void 테스트_설정에는_키가_없어서_실제_번역은_건너뛴다() {
        Spot spot = spot();
        realService.translateAsync(TranslationTarget.SPOT_REASON, spot.getId(), "창가 자리가 좋아요", "ko", "ja");
        assertThat(spotRepository.findById(spot.getId()).orElseThrow().getReasonTranslated()).isNull();
    }
}
