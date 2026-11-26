package server.safety.repository;

import java.util.UUID;

import server.safety.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Long> {
    boolean existsByReporterIdAndMatchIdAndTargetUserId(UUID reporterId, Long matchId, UUID targetUserId);
}
