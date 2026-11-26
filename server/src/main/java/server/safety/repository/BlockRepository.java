package server.safety.repository;

import java.util.UUID;

import server.safety.domain.Block;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BlockRepository extends JpaRepository<Block, Block.Key> {
    boolean existsByBlockerIdAndBlockedId(UUID blockerId, UUID blockedId);
    List<Block> findByBlockerIdOrderByCreatedAtDesc(UUID blockerId);

    /** 이 매칭에서 내가 차단당했는지 (ENDED 표시, 피드백 권한) */
    Optional<Block> findFirstByMatchIdAndBlockedId(Long matchId, UUID blockedId);

    /** 서로 한쪽이라도 차단했는지 (추천 제외용) */
    @Query("select case when count(b) > 0 then true else false end from Block b where (b.blockerId = :a and b.blockedId = :b) or (b.blockerId = :b and b.blockedId = :a)")
    boolean existsBetween(@Param("a") UUID a, @Param("b") UUID b);

    /** 이 사용자와 차단 관계인 모든 상대 id (서버 B 추천 후보 제외용) */
    @Query("select case when b.blockerId = :userId then b.blockedId else b.blockerId end " +
           "from Block b where b.blockerId = :userId or b.blockedId = :userId")
    List<UUID> findBlockedRelations(@Param("userId") UUID userId);
}
