package server.translation;

import server.global.event.TranslationTarget;

/**
 * [B 소유 · A가 사용] 번역. 원문을 저장한 뒤 호출한다.
 * 구현은 반드시 "트랜잭션 커밋 후 + 비동기"로 처리하고(LLM 이 느려도 쪽지 전송이 막히지 않게),
 * 성공하면 대상 행의 *_translated 칼럼을 채우고, 실패하면 null 그대로 둔다 (앱은 원문 표시).
 */
public interface TranslationService {
    void translateAsync(TranslationTarget target, Long id, String text, String sourceLang, String targetLang);
}
