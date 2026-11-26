package server.visit.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import server.global.common.Guards;
import server.global.security.AuthUser;
import server.visit.service.VisitService;

import java.util.List;

@Tag(name = "방문 인증")
@RestController
@RequiredArgsConstructor
public class VisitController {

    private final VisitService visitService;

    @Operation(summary = "VISIT-01 방문 인증 (스팟 200m 이내, DEMO_MODE 면 위치 확인 생략. 좌표는 저장하지 않음)")
    @PostMapping("/api/v1/matches/{matchId}/visits")
    @ResponseStatus(HttpStatus.CREATED)
    public VisitService.VisitCreated verify(AuthUser me, @PathVariable Long matchId,
                                            @Valid @RequestBody VisitService.VisitRequest req) {
        Guards.requireTraveler(me);
        return visitService.verify(me, matchId, req);
    }

    @Operation(summary = "VISIT-02 방문 기록 목록 (최근 인증 순, 리액션 포함)")
    @GetMapping("/api/v1/matches/{matchId}/visits")
    public List<VisitService.VisitView> list(AuthUser me, @PathVariable Long matchId) {
        return visitService.list(me, matchId);
    }

    @Operation(summary = "VISIT-03 리액션·댓글 (메이트, 이모지·댓글 중 하나 이상)")
    @PostMapping("/api/v1/visits/{visitId}/reactions")
    @ResponseStatus(HttpStatus.CREATED)
    public VisitService.ReactionCreated react(AuthUser me, @PathVariable Long visitId,
                                              @Valid @RequestBody VisitService.ReactionRequest req) {
        Guards.requireMate(me);
        return visitService.react(me, visitId, req);
    }
}
