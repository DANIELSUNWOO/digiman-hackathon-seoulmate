package server.translation;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import server.global.event.TranslationTarget;

/** [B 임시 구현] 번역하지 않는다 (translated = null → 앱이 원문 표시). 선우님이 LLM 구현으로 교체 */
@Slf4j
@Service
public class NoOpTranslationService implements TranslationService {
    @Override
    public void translateAsync(TranslationTarget target, Long id, String text, String sourceLang, String targetLang) {
        log.debug("translation skipped (not implemented yet): {} #{} {}->{}", target, id, sourceLang, targetLang);
    }
}
