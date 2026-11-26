package server.trip.api;

import server.global.common.Guards;
import server.global.security.AuthUser;
import server.trip.service.TripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@Tag(name = "회원/온보딩")
@RestController
@RequestMapping("/api/v1/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    @Operation(summary = "TRIP-01 여행 일정 등록 (여행자)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TripService.TripView create(AuthUser me, @Valid @RequestBody TripService.TripRequest req) {
        Guards.requireTraveler(me);
        return tripService.create(me.id(), req);
    }

    @Operation(summary = "TRIP-02 진행 중인 여행 일정 (없으면 404 TRIP_NOT_FOUND)")
    @GetMapping("/current")
    public TripService.TripView current(AuthUser me) {
        Guards.requireTraveler(me);
        return tripService.current(me.id());
    }

    @Operation(summary = "TRIP-03 여행 일정 수정")
    @PatchMapping("/{tripId}")
    public TripService.TripView update(AuthUser me, @PathVariable Long tripId,
                                       @RequestBody TripService.TripPatch req) {
        Guards.requireTraveler(me);
        return tripService.update(me.id(), tripId, req);
    }
}
