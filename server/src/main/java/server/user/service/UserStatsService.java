package server.user.service;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;
import server.map.service.MapQuery;
import server.match.repository.MatchRepository;
import server.trip.repository.TripRepository;
import server.user.domain.User;
import server.user.repository.UserRepository;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * USER-06 마이페이지 활동 요약 3칸 (API v1.7, 화면 C-02 "わたしの足あと").
 *  여행자: tripDay(진행 중 여행 며칠째, 시작 전·일정 없음이면 null) · matesMet · visitedSpots
 *  메이트: activeDays(가입일부터 오늘까지, 가입일 = 1일째) · travelersMet · completedMaps(공개 조건을 채운 지도 수)
 */
@Service
@RequiredArgsConstructor
public class UserStatsService {

    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final MatchRepository matchRepository;
    private final MapQuery mapQuery;
    private final Clock clock;

    @Transactional(readOnly = true)
    public Stats stats(AuthUser me) {
        LocalDate today = LocalDate.now(clock);
        User u = userRepository.findById(me.id()).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_REGISTERED));
        if (u.isTraveler()) {
            Integer tripDay = tripRepository.findFirstByTravelerIdAndEndDateGreaterThanEqualOrderByIdDesc(u.getId(), today)
                    .filter(t -> !t.getStartDate().isAfter(today))
                    .map(t -> (int) ChronoUnit.DAYS.between(t.getStartDate(), today) + 1)
                    .orElse(null);
            return new TravelerStats(tripDay, matchRepository.countDistinctMatesOf(u.getId()),
                    matchRepository.countVisitsOfTraveler(u.getId()));
        }
        long activeDays = ChronoUnit.DAYS.between(u.getCreatedAt().toLocalDate(), today) + 1;
        return new MateStats(activeDays, matchRepository.countDistinctTravelersOf(u.getId()),
                mapQuery.findPublicMaps(u.getId()).size());
    }

    /** 역할에 맞는 3칸만 내려간다 */
    public sealed interface Stats permits TravelerStats, MateStats {}

    @JsonInclude(JsonInclude.Include.ALWAYS)          // tripDay 가 null 이어도 키는 내려간다
    public record TravelerStats(Integer tripDay, long matesMet, long visitedSpots) implements Stats {}

    public record MateStats(long activeDays, long travelersMet, long completedMaps) implements Stats {}
}
