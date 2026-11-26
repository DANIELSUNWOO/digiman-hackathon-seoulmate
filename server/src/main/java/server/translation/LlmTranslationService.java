package server.translation;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import server.global.event.TranslationTarget;

/**
 * [서버 B] AI 번역 (F-35). TranslationService 의 실제 구현.
 * 1) 원문을 저장한 트랜잭션이 커밋된 뒤에 (롤백되면 번역하지 않는다)
 * 2) 번역 전용 스레드에서 LLM 을 부르고 (요청한 API 는 기다리지 않는다)
 * 3) 성공하면 *_translated 를 채우고, 실패하면 로그만 남기고 null 로 둔다 (앱은 원문 표시)
 * LLM_API_KEY 가 없으면 아무것도 하지 않는다 (테스트·키 없는 로컬 실행).
 */
@Slf4j
@Service
public class LlmTranslationService implements TranslationService {

    private final LlmTranslator translator;
    private final TranslationWriter writer;
    private final TaskExecutor executor;

    public LlmTranslationService(LlmTranslator translator, TranslationWriter writer,
                                 @Qualifier("translationExecutor") TaskExecutor executor) {
        this.translator = translator;
        this.writer = writer;
        this.executor = executor;
    }

    @Override
    public void translateAsync(TranslationTarget target, Long id, String text, String sourceLang, String targetLang) {
        if (text == null || text.isBlank() || id == null || sourceLang.equals(targetLang)) return;
        if (!translator.enabled()) {
            log.debug("translation skipped (LLM_API_KEY not set): {} #{}", target, id);
            return;
        }
        Runnable job = () -> translateNow(target, id, text, sourceLang, targetLang);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    submit(job, target, id);
                }
            });
        } else {
            submit(job, target, id);
        }
    }

    private void submit(Runnable job, TranslationTarget target, Long id) {
        try {
            executor.execute(job);
        } catch (TaskRejectedException e) {
            log.warn("translation queue full, skipped: {} #{}", target, id);
        }
    }

    void translateNow(TranslationTarget target, Long id, String text, String sourceLang, String targetLang) {
        try {
            String translated = translator.translate(text, sourceLang, targetLang);
            if (translated == null) {
                log.warn("translation returned empty: {} #{}", target, id);
                return;
            }
            boolean filled = writer.fill(target, id, text, translated);
            log.debug("translated {} #{} {}->{} (filled={})", target, id, sourceLang, targetLang, filled);
        } catch (Exception e) {
            // 키 오류(401), 크레딧 소진, 시간 초과 등. 글 저장은 이미 끝났으므로 번역 칸만 비워 둔다
            log.warn("translation failed: {} #{} {}->{}: {}", target, id, sourceLang, targetLang, e.getMessage());
        }
    }
}
