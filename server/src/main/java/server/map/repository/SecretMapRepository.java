package server.map.repository;

import java.util.UUID;

import server.map.domain.SecretMap;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** [서버 B 소유] 서버 A는 아래 메서드만 사용. 필요한 메서드는 서버 B가 자유롭게 추가 */
public interface SecretMapRepository extends JpaRepository<SecretMap, Long> {
    List<SecretMap> findByMateIdOrderByIdAsc(UUID mateId);
}
