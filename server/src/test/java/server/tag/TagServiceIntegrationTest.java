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
import server.user.domain.User;
import server.user.repository.UserRepository;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** TAG-01 분류 코드, TAG-02 개수 규칙 (분류당 2개, 전체 14개) 을 V3 시드로 확인한다 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TagServiceIntegrationTest {

    @Autowired DataSource dataSource;
    @Autowired TagService tagService;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void seedTags() {
        ScriptUtils.executeSqlScript(DataSourceUtils.getConnection(dataSource),
                new EncodedResource(new ClassPathResource("db/migration/V3__seed_tags.sql"), StandardCharsets.UTF_8));
    }

    private UUID mate() {
        return userRepository.save(User.register(UUID.randomUUID(), "KR", 5, LocalDateTime.now())).getId();
    }

    @Test
    void 트리에_분류_코드가_있어서_앱이_AREA_를_거를_수_있다() {
        List<TagService.TagTree> tree = tagService.tree("ja");
        assertThat(tree).extracting(TagService.TagTree::category)
                .contains("FOOD", "WALK", "CULTURE", "SHOP", "SPORTS", "WELLNESS", "AREA");
        assertThat(tree).allMatch(t -> !t.children().isEmpty());
    }

    @Test
    void 메이트는_분류마다_2개씩_동네까지_14개를_고를_수_있다() {
        List<Long> picks = new ArrayList<>();
        for (TagService.TagTree category : tagService.tree("ko")) {
            category.children().stream().limit(2).forEach(c -> picks.add(c.tagId()));
        }
        assertThat(picks).hasSize(14);
        var saved = tagService.replaceMine(mate(), "ko", picks);
        assertThat(saved).hasSize(14);
        assertThat(saved).extracting(TagService.TagView::category).contains("AREA");
    }

    @Test
    void 한_분류에서_3개를_고르면_TAG_COUNT_INVALID() {
        TagService.TagTree food = tagService.tree("ko").stream()
                .filter(t -> "FOOD".equals(t.category())).findFirst().orElseThrow();
        List<Long> three = food.children().stream().limit(3).map(TagService.TagTree.Child::tagId).toList();
        UUID mate = mate();
        assertThatThrownBy(() -> tagService.replaceMine(mate, "ko", three))
                .satisfies(e -> assertThat(((ApiException) e).getErrorCode()).isEqualTo(ErrorCode.TAG_COUNT_INVALID));
    }
}
