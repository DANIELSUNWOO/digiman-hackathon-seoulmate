package server.match.api;

import server.global.common.Guards;
import server.global.security.AuthUser;
import server.match.service.CourseService;
import server.match.service.MatchDtos;
import server.match.service.MatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "매칭")
@RestController
@RequestMapping("/api/v1/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;
    private final CourseService courseService;

    @Operation(summary = "MATCH-01 지도 선택 = 매칭 + 코스 확정 (mapId)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MatchDtos.ApplyResponse apply(AuthUser me, @Valid @RequestBody MatchDtos.ApplyRequest req) {
        Guards.requireTraveler(me);
        return matchService.apply(me, req.mapId());
    }

    @Operation(summary = "MATCH-02 내 매칭 목록 (state=active|ended, mapId=지도별 대화 목록)")
    @GetMapping
    public List<MatchDtos.MatchItem> list(AuthUser me, @RequestParam(required = false) String state,
                                          @RequestParam(required = false) Long mapId) {
        return matchService.list(me, state, mapId);
    }

    @Operation(summary = "MATCH-03 매칭 상세")
    @GetMapping("/{matchId}")
    public MatchDtos.MatchDetail detail(AuthUser me, @PathVariable Long matchId) {
        return matchService.detail(me, matchId);
    }

    @Operation(summary = "MATCH-06 코스 지도 (스팟 전체 + 스탬프)")
    @GetMapping("/{matchId}/course")
    public MatchDtos.CourseView course(AuthUser me, @PathVariable Long matchId) {
        return courseService.course(me, matchId);
    }

    @Operation(summary = "MATCH-07 매칭 끊기 (여행자·메이트, 사유 선택)")
    @PostMapping("/{matchId}/cancel")
    public MatchDtos.CancelResponse cancel(AuthUser me, @PathVariable Long matchId,
                                           @Valid @RequestBody(required = false) MatchDtos.CancelRequest req) {
        return matchService.cancel(me, matchId, req);
    }

    @Operation(summary = "MATCH-08 여행 완료 + 앨범 생성")
    @PostMapping("/{matchId}/complete")
    public MatchDtos.CompleteResponse complete(AuthUser me, @PathVariable Long matchId,
                                               @Valid @RequestBody(required = false) MatchDtos.CompleteRequest req) {
        return matchService.complete(me, matchId, req);
    }
}
