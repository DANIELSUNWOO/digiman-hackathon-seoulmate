package server.album.domain;

import java.util.UUID;

import org.hibernate.annotations.DynamicUpdate;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** [서버 B 소유] 상호 후기 */
@Entity
@DynamicUpdate   // 바뀐 칸만 UPDATE: 번역 저장이 다른 칸을 덮지 않는다
@Table(name = "reviews")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Review {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "reviewer_id", nullable = false)
    private UUID reviewerId;

    @Column(name = "reviewee_id", nullable = false)
    private UUID revieweeId;

    @Column(nullable = false)
    private int rating;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "content_translated", columnDefinition = "TEXT")
    private String contentTranslated;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static Review of(Long matchId, UUID reviewerId, UUID revieweeId, int rating, String content, LocalDateTime now) {
        Review r = new Review();
        r.matchId = matchId;
        r.reviewerId = reviewerId;
        r.revieweeId = revieweeId;
        r.rating = rating;
        r.content = content;
        r.createdAt = now;
        return r;
    }

    public void fillTranslation(String translated) { this.contentTranslated = translated; }
}
