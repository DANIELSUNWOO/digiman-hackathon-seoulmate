package server.trip.repository;

import java.util.UUID;

import server.trip.domain.Trip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface TripRepository extends JpaRepository<Trip, Long> {
    /** 진행 중 일정 = 종료일이 오늘 이후(오늘 포함)인 가장 최근 일정 */
    Optional<Trip> findFirstByTravelerIdAndEndDateGreaterThanEqualOrderByIdDesc(UUID travelerId, LocalDate today);
}
