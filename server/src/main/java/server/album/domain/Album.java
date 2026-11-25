package server.album.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** [서버 B 소유] 앨범. MatchCompletedEvent 를 받아 서버 B가 생성한다. */
@Entity
@Table(name = "albums")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Album {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_id", nullable = false, unique = true)
    private Long matchId;

    @Column(length = 100)
    private String title;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static Album of(Long matchId, String title, String coverUrl, LocalDateTime now) {
        Album a = new Album();
        a.matchId = matchId;
        a.title = title;
        a.coverUrl = coverUrl;
        a.createdAt = now;
        return a;
    }

    public void edit(String title, String coverUrl) {
        if (title != null) this.title = title;
        if (coverUrl != null) this.coverUrl = coverUrl;
    }
}
