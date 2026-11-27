package server.map.repository;

import java.util.UUID;

import server.map.domain.SecretMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

/** [서버 B 소유] 서버 A는 아래 메서드만 사용. 필요한 메서드는 서버 B가 자유롭게 추가 */
public interface SecretMapRepository extends JpaRepository<SecretMap, Long> {
    List<SecretMap> findByMateIdOrderByIdAsc(UUID mateId);

    /** 행 잠금 조회: 캡션 번역 저장과 지도 수정이 차례로 처리되게 한다 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from SecretMap m where m.id = :id")
    Optional<SecretMap> findByIdForUpdate(@Param("id") Long id);
}
