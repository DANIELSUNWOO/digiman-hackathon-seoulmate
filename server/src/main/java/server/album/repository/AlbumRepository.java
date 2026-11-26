package server.album.repository;

import server.album.domain.Album;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** [서버 B 소유] 서버 A는 매칭 상세·완료 응답의 albumId 조회에만 사용 */
public interface AlbumRepository extends JpaRepository<Album, Long> {
    Optional<Album> findByMatchId(Long matchId);
}
