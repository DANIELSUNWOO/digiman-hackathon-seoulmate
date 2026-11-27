package server.match.repository;

import java.util.UUID;

import server.match.domain.Match;
import server.match.domain.MatchStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<Match, Long> {

    long countByTravelerIdAndStatusIn(UUID travelerId, Collection<MatchStatus> statuses);
    long countByMateIdAndStatusIn(UUID mateId, Collection<MatchStatus> statuses);
    boolean existsByTravelerIdAndMateIdAndStatusIn(UUID travelerId, UUID mateId, Collection<MatchStatus> statuses);
    boolean existsByCourseMapIdAndStatusIn(Long mapId, Collection<MatchStatus> statuses);

    /** USER-06 만난 메이트 수 (같은 사람은 1번) */
    @Query("select count(distinct m.mateId) from Match m where m.travelerId = :travelerId")
    long countDistinctMatesOf(@Param("travelerId") UUID travelerId);

    /** USER-06 만난 여행자 수 (같은 사람은 1번) */
    @Query("select count(distinct m.travelerId) from Match m where m.mateId = :mateId")
    long countDistinctTravelersOf(@Param("mateId") UUID mateId);

    /** USER-06 내가 인증한 스팟 수 (전체 매칭 합계) */
    @Query("select count(v) from SpotVisit v, Match m where v.matchId = m.id and m.travelerId = :travelerId")
    long countVisitsOfTraveler(@Param("travelerId") UUID travelerId);

    @Query("select m from Match m where (m.travelerId = :userId or m.mateId = :userId) and m.status in :statuses order by m.id desc")
    List<Match> findMine(@Param("userId") UUID userId, @Param("statuses") Collection<MatchStatus> statuses);

    @Query("select m from Match m where (m.travelerId = :userId or m.mateId = :userId) and m.status in :statuses")
    List<Match> findMineForWithdraw(@Param("userId") UUID userId, @Param("statuses") Collection<MatchStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Match m where m.id = :id")
    Optional<Match> findByIdForUpdate(@Param("id") Long id);

    /** 자동 종료·완료 배치 대상: 여행 종료일이 오늘보다 이전인 진행 중 매칭 */
    @Query("select m from Match m, Trip t " +
           "where t.id = m.tripId and m.status in :statuses and t.endDate < :today")
    List<Match> findActiveWithTripEndedBefore(@Param("statuses") Collection<MatchStatus> statuses,
                                              @Param("today") LocalDate today);
}
