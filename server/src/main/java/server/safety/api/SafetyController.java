package server.safety.api;

import server.global.security.AuthUser;
import server.safety.service.SafetyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "안전")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SafetyController {

    private final SafetyService safetyService;

    @Operation(summary = "REPORT-01 신고 (대상자는 서버가 매칭 상대로 지정)")
    @PostMapping("/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> report(AuthUser me, @Valid @RequestBody SafetyService.ReportRequest req) {
        return Map.of("reportId", safetyService.report(me, req));
    }

    @Operation(summary = "BLOCK-01 차단 (언제든, 사유 필수)")
    @PostMapping("/matches/{matchId}/block")
    public SafetyService.BlockResponse block(AuthUser me, @PathVariable Long matchId,
                                             @Valid @RequestBody SafetyService.BlockRequest req) {
        return safetyService.block(me, matchId, req);
    }

    @Operation(summary = "BLOCK-03 차단당한 쪽 피드백 (1회)")
    @PostMapping("/matches/{matchId}/block-feedback")
    @ResponseStatus(HttpStatus.CREATED)
    public SafetyService.FeedbackResponse feedback(AuthUser me, @PathVariable Long matchId,
                                                   @Valid @RequestBody SafetyService.FeedbackRequest req) {
        return safetyService.feedback(me, matchId, req.content());
    }

    @Operation(summary = "BLOCK-02 내 차단 목록")
    @GetMapping("/users/me/blocks")
    public List<SafetyService.BlockedUser> myBlocks(AuthUser me) {
        return safetyService.myBlocks(me);
    }
}
