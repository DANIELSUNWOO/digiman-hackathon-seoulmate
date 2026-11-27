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
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V3 → V4 태그 시드 SQL 을 H2 에 실제 순서대로 실행해 본다 (테스트는 Flyway 를 끄므로 문법 오류를 여기서 잡는다).
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
    void runV3ThenV4() {
        for (String file : List.of("V3__seed_tags.sql", "V4__design_final_tags.sql")) {
            ScriptUtils.executeSqlScript(DataSourceUtils.getConnection(dataSource),
                    new EncodedResource(new ClassPathResource("db/migration/" + file), StandardCharsets.UTF_8));
        }
    }

    @Test
    void V4_는_디자인_최종본의_분류_11개로_바꾼다() {
        List<Tag> all = tagRepository.findAllByOrderByDepthAscIdAsc();
        List<String> roots = all.stream().filter(t -> t.getDepth() == 1).map(Tag::getCategory).toList();
        assertThat(roots).containsExactly("CAFE", "FOOD", "BEAUTY", "SHOP", "WALK", "CULTURE",
                "OSHI_KPOP", "OSHI_DRAMA", "OSHI_ANIME", "OSHI_BASEBALL", "AREA");
        assertThat(all).filteredOn(t -> t.getDepth() == 2).hasSize(63);
        assertThat(all).filteredOn(t -> t.getDepth() == 3).hasSize(87);
        // 예전(V3) 분류는 남지 않는다
        assertThat(all).noneMatch(t -> "SPORTS".equals(t.getCategory()) || "WELLNESS".equals(t.getCategory()));
    }

    @Test
    void 세부와_멤버는_같은_분류의_2단계_항목_아래에_있다() {
        List<Tag> all = tagRepository.findAllByOrderByDepthAscIdAsc();
        Map<Long, Tag> byId = all.stream().collect(Collectors.toMap(Tag::getId, Function.identity()));
        assertThat(all).filteredOn(t -> t.getDepth() > 1).allSatisfy(t -> {
            Tag parent = byId.get(t.getParentId());
            assertThat(parent).isNotNull();
            assertThat(parent.getDepth()).isEqualTo(t.getDepth() - 1);
            assertThat(parent.getCategory()).isEqualTo(t.getCategory());
        });
        Tag nojeon = all.stream().filter(t -> "노포".equals(t.getNameKo())).findFirst().orElseThrow();
        assertThat(byId.get(nojeon.getParentId()).getNameKo()).isEqualTo("로컬 식당");
        Tag jimin = all.stream().filter(t -> "ジミン".equals(t.getNameJa())).findFirst().orElseThrow();
        assertThat(byId.get(jimin.getParentId()).getNameKo()).isEqualTo("BTS");
    }

    @Test
    void 시연용_메이트_취향이_시드_이름과_맞아서_붙는다() {
        seeder.seed();
        for (DemoSeedData.MateSeed m : DemoSeedData.MATES) {
            assertThat(userTagRepository.findByUserId(m.id())).hasSize(m.tagNamesKo().size());
        }
    }

    @Test
    void 이미_시드가_있으면_메이트_취향만_다시_붙인다() {
        seeder.seed();
        DemoSeedData.MateSeed first = DemoSeedData.MATES.getFirst();
        userTagRepository.deleteAllByUserId(first.id());   // V4 가 예전 선택을 지운 상황

        assertThat(seeder.seed()).isFalse();

        assertThat(userTagRepository.findByUserId(first.id())).hasSize(first.tagNamesKo().size());
    }
}
