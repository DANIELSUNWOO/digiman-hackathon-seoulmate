package server.album.repository;

import server.album.domain.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** [서버 B 소유] */
public interface ReviewRepository extends JpaRepository<Review, Long> {
    boolean existsByMatchIdAndReviewerId(Long matchId, UUID reviewerId);
    List<Review> findByMatchIdOrderByIdAsc(Long matchId);
}
