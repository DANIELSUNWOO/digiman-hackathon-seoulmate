package server.map.repository;

import server.map.domain.Spot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

/** [서버 B 소유] 서버 A는 아래 메서드만 사용 */
public interface SpotRepository extends JpaRepository<Spot, Long> {
    List<Spot> findByMapIdOrderBySortOrderAscIdAsc(Long mapId);
    List<Spot> findByMapIdAndPreviewTrueOrderBySortOrderAscIdAsc(Long mapId);
    long countByMapId(Long mapId);

    /** 행 잠금 조회: 번역 저장과 스팟 수정이 차례로 처리되게 한다 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Spot s where s.id = :id")
    Optional<Spot> findByIdForUpdate(@Param("id") Long id);
    long countByMapIdAndPreviewTrue(Long mapId);
}
