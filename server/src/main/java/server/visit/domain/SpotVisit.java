package server.visit.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** [서버 B 소유] 방문 인증. 여행자 위치(lat/lng)는 저장하지 않는다. */
@Entity
@Table(name = "spot_visits")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SpotVisit {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "spot_id", nullable = false)
    private Long spotId;

    @Column(name = "photo_url", nullable = false, length = 500)
    private String photoUrl;

    @Column(columnDefinition = "TEXT")
    private String review;

    @Column(name = "review_translated", columnDefinition = "TEXT")
    private String reviewTranslated;

    @Column(name = "verified_at", nullable = false)
    private LocalDateTime verifiedAt;

    public static SpotVisit of(Long matchId, Long spotId, String photoUrl, String review, LocalDateTime now) {
        SpotVisit v = new SpotVisit();
        v.matchId = matchId;
        v.spotId = spotId;
        v.photoUrl = photoUrl;
        v.review = review;
        v.verifiedAt = now;
        return v;
    }

    public void fillTranslation(String translated) { this.reviewTranslated = translated; }
}
