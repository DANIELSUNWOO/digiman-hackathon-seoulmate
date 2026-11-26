package server.visit.repository;

import server.visit.domain.SpotVisit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** [서버 B 소유] 서버 A는 진행률·신고 검증에서 아래 메서드만 사용 */
public interface SpotVisitRepository extends JpaRepository<SpotVisit, Long> {
    long countByMatchId(Long matchId);
    List<SpotVisit> findByMatchId(Long matchId);
    Optional<SpotVisit> findFirstByMatchIdOrderByVerifiedAtDesc(Long matchId);
    boolean existsBySpotId(Long spotId);
    boolean existsBySpotIdIn(Collection<Long> spotIds);
    boolean existsByMatchIdAndSpotId(Long matchId, Long spotId);
    List<SpotVisit> findByMatchIdOrderByVerifiedAtDescIdDesc(Long matchId);
}
