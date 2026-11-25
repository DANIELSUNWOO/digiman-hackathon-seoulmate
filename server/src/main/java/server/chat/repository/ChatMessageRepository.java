package server.chat.repository;

import java.util.UUID;

import server.chat.domain.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByMatchIdAndIdGreaterThanOrderByIdAsc(Long matchId, Long afterId, Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query("update ChatMessage c set c.readAt = :now " +
           "where c.matchId = :matchId and c.senderId <> :readerId and c.readAt is null")
    int markRead(@Param("matchId") Long matchId, @Param("readerId") UUID readerId, @Param("now") LocalDateTime now);
}
