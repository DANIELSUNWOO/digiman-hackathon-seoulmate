package server.translation;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import server.chat.domain.ChatMessage;

/**
 * [B 소유] 번역 결과를 한 칸만 바꾸는 쿼리.
 * 쪽지(서버 A 엔티티)는 읽음 처리(read_at)와 번역 저장이 겹칠 수 있어, 엔티티 전체를 다시 쓰지 않고 번역 칸만 UPDATE 한다.
 */
public interface TranslationQueries extends Repository<ChatMessage, Long> {

    @Modifying
    @Query("update ChatMessage c set c.contentTranslated = :translated where c.id = :id")
    int fillChatTranslation(@Param("id") Long id, @Param("translated") String translated);
}
