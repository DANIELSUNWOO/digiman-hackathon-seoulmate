package server.tag;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.tag.service.TagService;
import server.tag.service.TagService.TagTree;
import server.user.domain.User;
import server.user.repository.UserRepository;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** TAG-01 3단계 트리, TAG-02 규칙 (디자인 최종본 11/26: 개수 제한 없음, 세부까지 저장) 을 V3 → V4 시드로 확인한다 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TagServiceIntegrationTest {

    @Autowired DataSource dataSource;
    @Autowired TagService tagService;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void seedTags() {
        for (String file : List.of("V3__seed_tags.sql", "V4__design_final_tags.sql")) {
            ScriptUtils.executeSqlScript(DataSourceUtils.getConnection(dataSource),
                    new EncodedResource(new ClassPathResource("db/migration/" + file), StandardCharsets.UTF_8));
        }
    }

    private UUID user(String country) {
        return userRepository.save(User.register(UUID.randomUUID(), country, 5, LocalDateTime.now())).getId();
    }

    private TagTree category(String code) {
        return tagService.tree("ko").stream().filter(t -> code.equals(t.category())).findFirst().orElseThrow();
    }

    private TagTree.Child item(String category, String nameKo) {
        return category(category).children().stream().filter(c -> nameKo.equals(c.name())).findFirst().orElseThrow();
    }

    private static void assertError(Runnable call, ErrorCode code) {
        assertThatThrownBy(call::run).isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getErrorCode()).isEqualTo(code));
    }

    @Test
    void 트리는_분류_항목_세부_3단계다() {
        List<TagTree> tree = tagService.tree("ja");
        assertThat(tree).extracting(TagTree::category).containsExactly(
                "CAFE", "FOOD", "BEAUTY", "SHOP", "WALK", "CULTURE",
                "OSHI_KPOP", "OSHI_DRAMA", "OSHI_ANIME", "OSHI_BASEBALL", "AREA");
        assertThat(tree).allMatch(t -> !t.children().isEmpty());
        assertThat(tree.stream().mapToInt(t -> t.children().size()).sum()).isEqualTo(63);
        assertThat(tree.stream().flatMap(t -> t.children().stream()).mapToInt(c -> c.children().size()).sum())
                .isEqualTo(87);

        assertThat(item("FOOD", "로컬 식당").children()).extracting(TagTree.Detail::name).contains("노포");
        assertThat(item("OSHI_KPOP", "BTS").children()).extracting(TagTree.Detail::name).contains("지민");
        assertThat(item("AREA", "성수").children()).isEmpty();                 // 세부가 없는 항목은 빈 목록
    }

    @Test
    void 개수_제한_없이_항목과_세부를_함께_저장하고_여행자도_동네를_고를_수_있다() {
        TagTree.Child local = item("FOOD", "로컬 식당");
        TagTree.Child bts = item("OSHI_KPOP", "BTS");
        List<Long> picks = new java.util.ArrayList<>();
        category("FOOD").children().forEach(c -> picks.add(c.tagId()));          // 한 분류에서 전부 (예전엔 2개까지)
        local.children().forEach(d -> picks.add(d.tagId()));                    // 3단계 세부
        picks.add(bts.children().get(0).tagId());                               // 推し 멤버
        picks.add(item("AREA", "연남").tagId());                                 // 「行ってみたい街」

        var saved = tagService.replaceMine(user("JP"), "ja", picks);
        assertThat(saved).hasSize(picks.size()).hasSizeGreaterThan(14);
        assertThat(saved).anyMatch(t -> t.depth() == 3 && t.parentId().equals(local.tagId()));
        assertThat(saved).anyMatch(t -> "AREA".equals(t.category()));
    }

    @Test
    void 비어_있거나_분류를_고르거나_없는_태그면_거절한다() {
        UUID me = user("KR");
        assertError(() -> tagService.replaceMine(me, "ko", List.of()), ErrorCode.TAG_COUNT_INVALID);
        assertError(() -> tagService.replaceMine(me, "ko", List.of(category("CAFE").tagId())), ErrorCode.INVALID_TAG);
        assertError(() -> tagService.replaceMine(me, "ko", List.of(-1L)), ErrorCode.INVALID_TAG);
    }
}
