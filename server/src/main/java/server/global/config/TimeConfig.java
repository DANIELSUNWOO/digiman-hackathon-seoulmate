package server.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/** 모든 "오늘" 계산은 서울 시간. 테스트에서는 Clock 을 바꿔 끼워 날짜를 조작한다. */
@Configuration
public class TimeConfig {
    public static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Bean
    public Clock clock() {
        return Clock.system(SEOUL);
    }
}
