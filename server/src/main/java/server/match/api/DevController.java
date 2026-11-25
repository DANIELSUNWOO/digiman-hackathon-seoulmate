package server.match.api;

import server.match.service.MatchLifecycleJob;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 시연 전용. DEMO_MODE=true 일 때만 빈이 만들어진다 (운영에서는 주소 자체가 없음). DEV-02 는 서버 B */
@Tag(name = "시연 전용")
@RestController
@RequestMapping("/api/v1/dev")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "seoulmate.demo-mode", havingValue = "true")
public class DevController {

    private final MatchLifecycleJob lifecycleJob;

    @Operation(summary = "DEV-01 자동 종료·완료 배치를 지금 바로 실행")
    @PostMapping("/expire-matches")
    public MatchLifecycleJob.Result expireNow() {
        return lifecycleJob.run();
    }
}
