package server.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import server.global.security.TokenUser;
import server.user.domain.VerifyStatus;
import server.user.repository.UserRepository;
import server.user.service.UserDtos.RegisterRequest;
import server.user.service.UserService;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** AUTH-01: 메이트는 휴대폰 본인인증이라 등록하자마자 인증 완료, 여행자는 여권 인증(USER-02) 전까지 NONE (디자인 11/26 M-02) */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserRegisterIntegrationTest {

    @Autowired UserService userService;
    @Autowired UserRepository userRepository;

    private TokenUser token() {
        return new TokenUser(UUID.randomUUID(), "test@example.com");
    }

    @Test
    void 메이트는_등록하자마자_인증_완료다() {
        TokenUser mate = token();
        userService.register(mate, new RegisterRequest("KR", true));

        assertThat(userRepository.findById(mate.id()).orElseThrow().getVerifyStatus()).isEqualTo(VerifyStatus.VERIFIED);
        var me = userService.me(mate);
        assertThat(me.onboarding().verified()).isTrue();      // 앱은 본인 인증 단계를 건너뛰고 프로필로 간다
        assertThat(me.verifyStatus()).isEqualTo("VERIFIED");
    }

    @Test
    void 여행자는_여권_인증_전까지_인증_전이다() {
        TokenUser traveler = token();
        userService.register(traveler, new RegisterRequest("JP", true));

        assertThat(userRepository.findById(traveler.id()).orElseThrow().getVerifyStatus()).isEqualTo(VerifyStatus.NONE);
        assertThat(userService.me(traveler).onboarding().verified()).isFalse();
    }
}
