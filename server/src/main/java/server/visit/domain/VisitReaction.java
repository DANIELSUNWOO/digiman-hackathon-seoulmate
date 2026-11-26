package server.visit.domain;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** [서버 B 소유] 메이트의 리액션·댓글 */
@Entity
@Table(name = "visit_reactions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VisitReaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visit_id", nullable = false)
    private Long visitId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(length = 20)
    private String emoji;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "comment_translated", columnDefinition = "TEXT")
    private String commentTranslated;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static VisitReaction of(Long visitId, UUID authorId, String emoji, String comment, LocalDateTime now) {
        VisitReaction r = new VisitReaction();
        r.visitId = visitId;
        r.authorId = authorId;
        r.emoji = emoji;
        r.comment = comment;
        r.createdAt = now;
        return r;
    }

    public void fillTranslation(String translated) { this.commentTranslated = translated; }
}
