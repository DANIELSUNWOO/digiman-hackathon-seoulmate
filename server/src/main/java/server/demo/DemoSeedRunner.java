package server.demo;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** DEMO_SEED=true 로 서버를 켜면 시연용 데이터를 넣는다 (이미 있으면 건너뜀). 운영에서는 끈다 */
@Component
@ConditionalOnProperty(name = "seoulmate.demo-seed", havingValue = "true")
@RequiredArgsConstructor
public class DemoSeedRunner implements ApplicationRunner {

    private final DemoDataSeeder seeder;

    @Override
    public void run(ApplicationArguments args) {
        seeder.seed();
    }
}
