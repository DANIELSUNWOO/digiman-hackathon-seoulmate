package server.visit.repository;

import server.visit.domain.VisitReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

/** [서버 B 소유] */
public interface VisitReactionRepository extends JpaRepository<VisitReaction, Long> {
    List<VisitReaction> findByVisitIdInOrderByIdAsc(Collection<Long> visitIds);
}
