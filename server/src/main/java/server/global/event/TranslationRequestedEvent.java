package server.global.event;

/**
 * [서버 A → 서버 B] 글을 저장한 뒤 발행한다.
 * 서버 B의 번역 담당이 @TransactionalEventListener(AFTER_COMMIT) + @Async 로 받아
 * LLM 번역 후 해당 행의 *_translated 컬럼을 채운다. 실패하면 null 그대로 둔다 (명세 0-3).
 */
public record TranslationRequestedEvent(TranslationTarget target, Long id, String text,
                                        String sourceLang, String targetLang) {}
