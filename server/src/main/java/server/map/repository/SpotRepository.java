package server.map.repository;

import server.map.domain.Spot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** [서버 B 소유] 서버 A는 아래 메서드만 사용 */
public interface SpotRepository extends JpaRepository<Spot, Long> {
    List<Spot> findByMapIdOrderBySortOrderAscIdAsc(Long mapId);
    List<Spot> findByMapIdAndPreviewTrueOrderBySortOrderAscIdAsc(Long mapId);
    long countByMapId(Long mapId);
    long countByMapIdAndPreviewTrue(Long mapId);
}
