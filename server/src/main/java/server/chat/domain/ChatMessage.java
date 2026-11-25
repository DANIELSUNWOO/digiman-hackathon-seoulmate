package server.chat.domain;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "content_translated", columnDefinition = "TEXT")
    private String contentTranslated;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    public static ChatMessage of(Long matchId, UUID senderId, String content, LocalDateTime now) {
        ChatMessage m = new ChatMessage();
        m.matchId = matchId;
        m.senderId = senderId;
        m.content = content;
        m.createdAt = now;
        return m;
    }

    public void fillTranslation(String translated) { this.contentTranslated = translated; }
}
