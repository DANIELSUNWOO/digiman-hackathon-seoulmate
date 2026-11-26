package server.trip.service;

import java.util.UUID;

import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.trip.domain.Trip;
import server.trip.repository.TripRepository;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final Clock clock;

    @Transactional
    public TripView create(UUID travelerId, TripRequest req) {
        LocalDate today = LocalDate.now(clock);
        validate(req.startDate(), req.endDate(), today);
        if (tripRepository.findFirstByTravelerIdAndEndDateGreaterThanEqualOrderByIdDesc(travelerId, today).isPresent()) {
            throw new ApiException(ErrorCode.TRIP_EXISTS);        // MVP 는 진행 중 일정 1개
        }
        Trip trip = tripRepository.save(Trip.of(travelerId, req.startDate(), req.endDate(), LocalDateTime.now(clock)));
        return TripView.of(trip);
    }

    @Transactional(readOnly = true)
    public TripView current(UUID travelerId) {
        return tripRepository.findFirstByTravelerIdAndEndDateGreaterThanEqualOrderByIdDesc(travelerId, LocalDate.now(clock))
                .map(TripView::of)
                .orElseThrow(() -> new ApiException(ErrorCode.TRIP_NOT_FOUND));
    }

    @Transactional
    public TripView update(UUID travelerId, Long tripId, TripPatch req) {
        Trip trip = tripRepository.findById(tripId)
                .filter(t -> t.getTravelerId().equals(travelerId))       // 남의 일정은 없는 것처럼
                .orElseThrow(() -> new ApiException(ErrorCode.TRIP_NOT_FOUND));
        LocalDate start = req.startDate() != null ? req.startDate() : trip.getStartDate();
        LocalDate end = req.endDate() != null ? req.endDate() : trip.getEndDate();
        validate(start, end, LocalDate.now(clock));
        trip.change(start, end);
        return TripView.of(trip);
    }

    private void validate(LocalDate start, LocalDate end, LocalDate today) {
        if (end.isBefore(start)) throw new ApiException(ErrorCode.INVALID_DATE_RANGE);
        if (end.isBefore(today)) throw new ApiException(ErrorCode.PAST_DATE);
    }

    public record TripRequest(@NotNull LocalDate startDate, @NotNull LocalDate endDate) {}

    public record TripPatch(LocalDate startDate, LocalDate endDate) {}

    public record TripView(Long tripId, LocalDate startDate, LocalDate endDate) {
        static TripView of(Trip t) {
            return new TripView(t.getId(), t.getStartDate(), t.getEndDate());
        }
    }
}
