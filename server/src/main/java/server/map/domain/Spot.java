package server.map.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** [서버 B 소유] 스팟. lat/lng 는 스팟 위치 (여행자 위치 아님) */
@Entity
@Table(name = "spots")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Spot {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "map_id", nullable = false)
    private Long mapId;

    @Column(nullable = false, length = 100)
    private String name;

    private String address;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal lng;

    @Column(name = "tag_id")
    private Long tagId;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "reason_translated", columnDefinition = "TEXT")
    private String reasonTranslated;

    @Column(columnDefinition = "TEXT")
    private String review;

    @Column(name = "review_translated", columnDefinition = "TEXT")
    private String reviewTranslated;

    @Column(name = "is_preview", nullable = false)
    private boolean preview;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @OneToMany(mappedBy = "spot", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<SpotPhoto> photos = new ArrayList<>();

    public static Spot of(Long mapId, String name, String address, BigDecimal lat, BigDecimal lng,
                          Long tagId, String reason, String review, int sortOrder) {
        Spot s = new Spot();
        s.mapId = mapId;
        s.name = name;
        s.address = address;
        s.lat = lat;
        s.lng = lng;
        s.tagId = tagId;
        s.reason = reason;
        s.review = review;
        s.sortOrder = sortOrder;
        return s;
    }

    public void addPhoto(String url) {
        photos.add(SpotPhoto.of(this, url, photos.size()));
    }

    public void setPreview(boolean preview) { this.preview = preview; }

    public List<String> photoUrls() {
        return photos.stream().map(SpotPhoto::getUrl).toList();
    }
}
