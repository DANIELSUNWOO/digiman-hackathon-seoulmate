package server.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import server.user.domain.MatchPreference;

import java.util.UUID;

public interface MatchPreferenceRepository extends JpaRepository<MatchPreference, UUID> {
}
