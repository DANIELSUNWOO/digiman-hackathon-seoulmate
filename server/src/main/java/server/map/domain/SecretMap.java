package server.map.domain;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** [서버 B 소유] 비밀지도. 서버 A는 코스 선택·지도 목록에서 읽기만 한다. */
@Entity
@Table(name = "secret_maps")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SecretMap {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mate_id", nullable = false)
    private UUID mateId;

    @Column(nullable = false, length = 30)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String caption;

    @Column(name = "caption_translated", columnDefinition = "TEXT")
    private String captionTranslated;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** 지도·스팟이 추가·수정된 마지막 시각 ("최근 업데이트 순", ERD v2.3) */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static SecretMap of(UUID mateId, String title, String caption, LocalDateTime now) {
        SecretMap m = new SecretMap();
        m.mateId = mateId;
        m.title = title;
        m.caption = caption;
        m.createdAt = now;
        m.updatedAt = now;
        return m;
    }

    public void edit(String title, String caption) {
        if (title != null) this.title = title;
        if (caption != null) { this.caption = caption; this.captionTranslated = null; }
    }

    public void fillTranslation(String translated) { this.captionTranslated = translated; }

    /** 지도 또는 그 지도의 스팟이 바뀌면 서버 B가 호출 */
    public void touch(LocalDateTime now) { this.updatedAt = now; }
}
