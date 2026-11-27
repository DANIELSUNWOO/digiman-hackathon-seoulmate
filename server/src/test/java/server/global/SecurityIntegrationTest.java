package server.global;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Supabase 토큰 대신 테스트용 JWT(sub = 무작위 UUID)를 넣어 확인 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityIntegrationTest {

    @Autowired MockMvc mvc;

    @Test
    void 토큰_없이_호출하면_401_UNAUTHORIZED() throws Exception {
        mvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void 회원_등록_전이면_404_USER_NOT_REGISTERED() throws Exception {
        mvc.perform(get("/api/v1/users/me").with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString()))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_REGISTERED"));
    }

    @Test
    void 회원_등록_후_내_정보_조회() throws Exception {
        String sub = UUID.randomUUID().toString();
        mvc.perform(post("/api/v1/users").with(jwt().jwt(j -> j.subject(sub).claim("email", "mate@test.com")))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"country\":\"KR\",\"agreeTerms\":true}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("MATE"));

        mvc.perform(get("/api/v1/users/me").with(jwt().jwt(j -> j.subject(sub).claim("email", "mate@test.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("mate@test.com"))
                .andExpect(jsonPath("$.matchCapacity.max").value(10))
                .andExpect(jsonPath("$.onboarding.verified").value(true));     // 메이트는 휴대폰 인증이라 등록 즉시 인증 완료 (디자인 11/26 M-02)

        mvc.perform(post("/api/v1/users").with(jwt().jwt(j -> j.subject(sub)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"country\":\"KR\",\"agreeTerms\":true}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("USER_ALREADY_REGISTERED"));
    }

    @Test
    void 약관_미동의는_400_TERMS_NOT_AGREED() throws Exception {
        mvc.perform(post("/api/v1/users").with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"country\":\"JP\",\"agreeTerms\":false}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TERMS_NOT_AGREED"));
    }

    @Test
    void 잘못된_국적은_400_VALIDATION_ERROR와_필드_정보() throws Exception {
        mvc.perform(post("/api/v1/users").with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"country\":\"US\",\"agreeTerms\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("country"));
    }

    @Test
    void 메이트가_여행자_전용_API를_부르면_403_ROLE_FORBIDDEN() throws Exception {
        String sub = UUID.randomUUID().toString();
        mvc.perform(post("/api/v1/users").with(jwt().jwt(j -> j.subject(sub)))
                .contentType(MediaType.APPLICATION_JSON).content("{\"country\":\"KR\",\"agreeTerms\":true}"));
        mvc.perform(get("/api/v1/trips/current").with(jwt().jwt(j -> j.subject(sub))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ROLE_FORBIDDEN"));
    }
}
