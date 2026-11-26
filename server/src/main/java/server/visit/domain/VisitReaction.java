package server.visit.domain;

import java.util.UUID;

import jakarta.persistence.*;
import org.hibernate.annotations.DynamicUpdate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** [서버 B 소유] 메이트의 리액션·댓글 */
@Entity
@Table(name = "visit_reactions")
@DynamicUpdate   // 바뀐 칸만 UPDATE: 번역 저장과 사용자 수정이 겹쳐도 서로의 값을 덮지 않는다
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

    /** 리액션 행: emoji 에 LIKE·LAUGH·CHEER 중 하나 (방문 기록당 1개, API v1.7 VISIT-03) */
    public static VisitReaction reaction(Long visitId, UUID authorId, String type, LocalDateTime now) {
        return of(visitId, authorId, type, null, now);
    }

    /** 댓글 행: comment 만 있다 (API v1.7 VISIT-05) */
    public static VisitReaction comment(Long visitId, UUID authorId, String content, LocalDateTime now) {
        return of(visitId, authorId, null, content, now);
    }

    public boolean isReaction() { return emoji != null; }

    public boolean isComment() { return comment != null; }

    public void changeReaction(String type) { this.emoji = type; }

    /** 리액션만 지운다. 이전 버전에서 이모지와 댓글을 한 행에 저장한 기록은 댓글을 남기기 위해 행을 지우지 않는다 */
    public void clearReaction() { this.emoji = null; }

    public void fillTranslation(String translated) { this.commentTranslated = translated; }
}
