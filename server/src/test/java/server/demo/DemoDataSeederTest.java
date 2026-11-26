package server.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import server.map.domain.SecretMap;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.map.service.MapVisibility;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.user.repository.UserRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 시연용 데이터. 다른 테스트의 목록 결과에 섞이지 않도록 테스트가 끝나면 되돌린다(@Transactional).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DemoDataSeederTest {

    @Autowired DemoDataSeeder seeder;
    @Autowired UserRepository userRepository;
    @Autowired SecretMapRepository mapRepository;
    @Autowired SpotRepository spotRepository;
    @Autowired MatchRepository matchRepository;
    @Autowired MapVisibility mapVisibility;

    @Test
    void 메이트와_공개_지도를_한_번만_넣는다() {
        assertThat(seeder.seed()).isTrue();
        assertThat(seeder.seed()).isFalse();                       // 두 번째는 건너뜀

        int mapCount = DemoSeedData.MATES.stream().mapToInt(m -> m.maps().size()).sum();
        List<SecretMap> maps = DemoSeedData.MATES.stream()
                .flatMap(m -> mapRepository.findByMateIdOrderByIdAsc(m.id()).stream()).toList();
        assertThat(maps).hasSize(mapCount);
        assertThat(maps).allMatch(m -> mapVisibility.isPublic(m.getId()));          // 모두 공개 조건 충족
        assertThat(maps).allMatch(m -> m.getCaptionTranslated() != null && m.getTitleTranslated() != null);   // 번역도 채워져 있다

        SecretMap first = maps.get(0);
        assertThat(spotRepository.findByMapIdOrderBySortOrderAscIdAsc(first.getId()))
                .allMatch(s -> s.getReasonTranslated() != null && s.photoUrls().size() == 1);
        assertThat(matchRepository.existsByCourseMapIdAndStatusIn(first.getId(), List.of(MatchStatus.COMPLETED))).isTrue();
        assertThat(matchRepository.existsByCourseMapIdAndStatusIn(first.getId(), MatchStatus.ACTIVE)).isFalse();

        var mate = userRepository.findById(DemoSeedData.MARKER).orElseThrow();
        assertThat(mate.isVerified()).isTrue();
        assertThat(mate.isMate()).isTrue();
    }

    @Test
    void 시드_데이터는_명세의_입력_제한을_지킨다() {
        for (var m : DemoSeedData.MATES) {
            assertThat(m.nickname().length()).isBetween(2, 8);
            assertThat(m.bio().length()).isLessThanOrEqualTo(200);
            for (var map : m.maps()) {
                assertThat(map.title().length()).isLessThanOrEqualTo(30);
                assertThat(map.captionKo().length()).isLessThanOrEqualTo(300);
                assertThat(map.spots().size()).isGreaterThanOrEqualTo(5);
                assertThat(map.spots().stream().filter(DemoSeedData.SpotSeed::preview).count()).isEqualTo(2);
                assertThat(map.spots()).allMatch(s -> s.name().length() <= 100 && s.reasonKo().length() <= 500);
            }
        }
    }
}
