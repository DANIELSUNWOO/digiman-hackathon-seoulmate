package server.map.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "spot_photos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SpotPhoto {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "spot_id", nullable = false)
    private Spot spot;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    static SpotPhoto of(Spot spot, String url, int order) {
        SpotPhoto p = new SpotPhoto();
        p.spot = spot;
        p.url = url;
        p.sortOrder = order;
        return p;
    }
}
