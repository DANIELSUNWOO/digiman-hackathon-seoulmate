package server.album.repository;

import server.album.domain.Review;
import org.springframework.data.jpa.repository.JpaRepository;

/** [서버 B 소유] */
public interface ReviewRepository extends JpaRepository<Review, Long> {
}
