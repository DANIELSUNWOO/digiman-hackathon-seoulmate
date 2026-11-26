package server.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import server.demo.DemoSeedData.MapSeed;
import server.demo.DemoSeedData.MateSeed;
import server.demo.DemoSeedData.SpotSeed;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.match.domain.Match;
import server.match.repository.MatchRepository;
import server.tag.domain.Tag;
import server.tag.domain.UserTag;
import server.tag.repository.TagRepository;
import server.tag.repository.UserTagRepository;
import server.trip.domain.Trip;
import server.trip.repository.TripRepository;
import server.user.domain.Gender;
import server.user.domain.User;
import server.user.repository.UserRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * [서버 B] 시연용 데이터 넣기. DEMO_SEED=true 로 서버를 켜면 한 번만 넣는다 (DemoSeedRunner).
 * - 이미 넣었으면(첫 메이트가 있으면) 아무것도 하지 않는다
 * - 메이트 4명 + 공개 지도 5개 + 지난 여행 기록(카드의 "n人が選択" 숫자용)
 * - 취향 태그는 tags 테이블에 같은 이름(name_ko)이 있을 때만 붙인다 (태그 시드 전이면 건너뜀)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DemoDataSeeder {

    /** 지난 여행을 마친 가짜 여행자 수 (지도별 pastTravelers 의 최댓값 이상) */
    private static final int PAST_TRAVELERS = 6;

    private final UserRepository userRepository;
    private final SecretMapRepository mapRepository;
    private final SpotRepository spotRepository;
    private final TagRepository tagRepository;
    private final UserTagRepository userTagRepository;
    private final TripRepository tripRepository;
    private final MatchRepository matchRepository;
    private final Clock clock;

    /** @return 새로 넣었으면 true, 이미 있으면 false */
    @Transactional
    public boolean seed() {
        if (userRepository.existsById(DemoSeedData.MARKER)) {
            log.info("demo seed: already present, skipped");
            return false;
        }
        LocalDateTime now = LocalDateTime.now(clock);
        Map<String, Tag> tagByName = tagRepository.findAll().stream()
                .filter(t -> t.getDepth() == 2)
                .collect(Collectors.toMap(Tag::getNameKo, Function.identity(), (a, b) -> a));

        List<PastTraveler> pastTravelers = pastTravelers(now);
        int maps = 0;
        int spots = 0;
        for (MateSeed m : DemoSeedData.MATES) {
            User mate = User.register(m.id(), "KR", 0, now.minusDays(60));
            mate.registerProfile(m.nickname(), m.gender(), m.birthYear(), null, m.bio());
            mate.verify();
            userRepository.save(mate);
            for (String name : m.tagNamesKo()) {
                Tag tag = tagByName.get(name);
                if (tag != null) userTagRepository.save(UserTag.of(mate.getId(), tag.getId()));
            }
            for (MapSeed ms : m.maps()) {
                SecretMap map = SecretMap.of(mate.getId(), ms.title(), ms.captionKo(), now.minusDays(30 - maps));
                map.fillTitleTranslation(ms.titleJa());
                map.fillTranslation(ms.captionJa());
                mapRepository.save(map);
                int order = 0;
                for (SpotSeed ss : ms.spots()) {
                    Spot s = Spot.of(map.getId(), ss.name(), ss.address(), coord(ss.lat()), coord(ss.lng()),
                            null, ss.reasonKo(), ss.reviewKo(), order);
                    s.addPhoto(DemoSeedData.photo(map.getId() + "-" + order));
                    s.setPreview(ss.preview());
                    s.fillReasonTranslation(ss.reasonJa());
                    s.fillReviewTranslation(ss.reviewJa());
                    spotRepository.save(s);
                    order++;
                    spots++;
                }
                pastTrips(pastTravelers, mate, map, ms, now);
                maps++;
            }
        }
        log.info("demo seed: {} mates, {} maps, {} spots", DemoSeedData.MATES.size(), maps, spots);
        return true;
    }

    private record PastTraveler(User user, Long tripId) {
    }

    /** 지난 여행을 마친 여행자들 (화면에는 나오지 않고 선택 횟수에만 쓰인다) */
    private List<PastTraveler> pastTravelers(LocalDateTime now) {
        List<PastTraveler> travelers = new ArrayList<>();
        LocalDate start = now.toLocalDate().minusDays(40);
        for (int i = 1; i <= PAST_TRAVELERS; i++) {
            User t = User.register(UUID.fromString(String.format("00000000-0000-4000-8000-00000000e%03d", i)),
                    "JP", 5, now.minusDays(50));
            t.registerProfile("seed旅人" + i, i % 2 == 0 ? Gender.MALE : Gender.FEMALE, 1996 + i, null, null);
            t.verify();
            userRepository.save(t);
            Trip trip = tripRepository.save(Trip.of(t.getId(), start, start.plusDays(3), now.minusDays(45)));
            travelers.add(new PastTraveler(t, trip.getId()));
        }
        return travelers;
    }

    private void pastTrips(List<PastTraveler> travelers, User mate, SecretMap map, MapSeed ms, LocalDateTime now) {
        int required = ms.spots().size() / 2;          // floor(스팟 수 × 0.5), API v1.7
        LocalDateTime matchedAt = now.minusDays(40);
        for (int i = 0; i < Math.min(ms.pastTravelers(), travelers.size()); i++) {
            PastTraveler t = travelers.get(i);
            Match match = Match.create(t.tripId(), t.user().getId(), mate.getId(), map.getId(), required, matchedAt);
            match.complete(matchedAt.plusDays(3));
            matchRepository.save(match);
        }
    }

    private static BigDecimal coord(double v) {
        return BigDecimal.valueOf(v).setScale(7, RoundingMode.HALF_UP);
    }
}
