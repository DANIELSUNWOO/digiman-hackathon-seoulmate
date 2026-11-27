package server.place;

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

/** PLACE-01 주소·권한·키 없음 처리 (테스트 설정은 키가 비어 있어 네이버를 부르지 않는다) */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PlaceControllerTest {

    @Autowired MockMvc mvc;

    private String register(String country) throws Exception {
        String sub = UUID.randomUUID().toString();
        mvc.perform(post("/api/v1/users").with(jwt().jwt(j -> j.subject(sub)))
                .contentType(MediaType.APPLICATION_JSON).content("{\"country\":\"" + country + "\",\"agreeTerms\":true}"))
                .andExpect(status().isCreated());
        return sub;
    }

    @Test
    void 여행자는_403_ROLE_FORBIDDEN() throws Exception {
        String sub = register("JP");
        mvc.perform(get("/api/v1/places/search").param("query", "성수 카페").with(jwt().jwt(j -> j.subject(sub))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ROLE_FORBIDDEN"));
    }

    @Test
    void 키가_없으면_503_PLACE_SEARCH_UNAVAILABLE_이고_검색어가_비면_400() throws Exception {
        String sub = register("KR");
        mvc.perform(get("/api/v1/places/search").param("query", "성수 카페").with(jwt().jwt(j -> j.subject(sub))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("PLACE_SEARCH_UNAVAILABLE"));
        mvc.perform(get("/api/v1/places/search").param("query", " ").with(jwt().jwt(j -> j.subject(sub))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
