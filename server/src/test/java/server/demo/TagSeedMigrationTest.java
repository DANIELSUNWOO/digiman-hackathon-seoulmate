package server.demo;

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
import server.tag.domain.Tag;
import server.tag.repository.TagRepository;
import server.tag.repository.UserTagRepository;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V3 태그 시드 SQL 을 H2 에 실제로 실행해 본다 (테스트는 Flyway 를 끄므로 문법 오류를 여기서 잡는다).
 * 시연용 데이터의 메이트 취향 이름이 시드와 맞는지도 확인한다. 끝나면 되돌린다(@Transactional).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TagSeedMigrationTest {

    @Autowired DataSource dataSource;
    @Autowired TagRepository tagRepository;
    @Autowired UserTagRepository userTagRepository;
    @Autowired DemoDataSeeder seeder;

    @BeforeEach
    void runV3() {
        ScriptUtils.executeSqlScript(DataSourceUtils.getConnection(dataSource),
                new EncodedResource(new ClassPathResource("db/migration/V3__seed_tags.sql"), StandardCharsets.UTF_8));
    }

    @Test
    void 분류_7개와_항목_30개가_들어간다() {
        List<Tag> all = tagRepository.findAllByOrderByDepthAscIdAsc();
        List<Tag> categories = all.stream().filter(t -> t.getDepth() == 1).toList();
        assertThat(categories).extracting(Tag::getCategory)
                .contains("FOOD", "WALK", "CULTURE", "SHOP", "SPORTS", "WELLNESS", "AREA");
        Map<Long, Long> itemsPerCategory = all.stream().filter(t -> t.getDepth() == 2)
                .collect(Collectors.groupingBy(Tag::getParentId, Collectors.counting()));
        assertThat(itemsPerCategory.values().stream().mapToLong(Long::longValue).sum()).isGreaterThanOrEqualTo(30);
        assertThat(all).filteredOn(t -> t.getDepth() == 2).allMatch(t -> t.getParentId() != null);
        assertThat(all).filteredOn(t -> "カフェ".equals(t.getNameJa())).hasSize(1);
    }

    @Test
    void 시연용_메이트_취향이_시드_이름과_맞아서_붙는다() {
        seeder.seed();
        for (DemoSeedData.MateSeed m : DemoSeedData.MATES) {
            assertThat(userTagRepository.findByUserId(m.id())).hasSize(m.tagNamesKo().size());
        }
    }
}
