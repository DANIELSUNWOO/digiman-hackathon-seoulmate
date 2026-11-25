package server.notification.domain;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private NotificationType type;

    /** 관련 매칭 id (ERD v2.1: ref_id = match_id 로 통일) */
    @Column(name = "ref_id")
    private Long refId;

    @Column(nullable = false)
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static Notification of(UUID userId, NotificationType type, Long matchId, String message, LocalDateTime now) {
        Notification n = new Notification();
        n.userId = userId;
        n.type = type;
        n.refId = matchId;
        n.message = message.length() > 255 ? message.substring(0, 255) : message;
        n.createdAt = now;
        return n;
    }

    public void markRead() { this.read = true; }
}
