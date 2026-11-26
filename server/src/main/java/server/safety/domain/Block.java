package server.safety.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/** 차단 (ERD v2.5: 사유 필수, 차단당한 쪽 피드백 1회) */
@Entity
@Table(name = "blocks")
@IdClass(Block.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Block {

    @Id @Column(name = "blocker_id")
    private UUID blockerId;

    @Id @Column(name = "blocked_id")
    private UUID blockedId;

    @Column(name = "match_id")
    private Long matchId;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private ReportReason reason;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "feedback_at")
    private LocalDateTime feedbackAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static Block of(UUID blockerId, UUID blockedId, Long matchId, ReportReason reason, String detail, LocalDateTime now) {
        Block b = new Block();
        b.blockerId = blockerId;
        b.blockedId = blockedId;
        b.matchId = matchId;
        b.reason = reason;
        b.detail = detail;
        b.createdAt = now;
        return b;
    }

    public boolean hasFeedback() { return feedback != null; }

    public void writeFeedback(String content, LocalDateTime now) {
        this.feedback = content;
        this.feedbackAt = now;
    }

    @EqualsAndHashCode
    @NoArgsConstructor
    public static class Key implements Serializable {
        private UUID blockerId;
        private UUID blockedId;
    }
}
