package server.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import server.album.domain.Review;
import server.album.repository.ReviewRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import server.demo.DemoSeedData.MapSeed;
import server.demo.DemoSeedData.MateSeed;
import server.demo.DemoSeedData.ReviewSeed;
import server.demo.DemoSeedData.SpotSeed;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
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
 * - 이미 넣었으면(첫 메이트가 있으면) 지도·스팟은 그대로 두고, 메이트 취향만 지금 태그 이름으로 다시 붙인다
 *   (V4 에서 취향 목록을 바꾸면 예전 선택이 지워지므로, DEMO_SEED=true 로 한 번 더 켜면 복구된다)
 * - 메이트 4명 + 공개 지도 5개 + 지난 여행 기록(카드의 "n人が選択" 숫자용)
 * - 지난 여행마다 여행자가 남긴 후기 (받은 후기 모음 C-02a). 이미 넣은 DB 에도 빠진 후기만 채운다
 * - 취향 태그는 tags 테이블에 같은 이름(name_ko)이 있을 때만 붙인다 (2단계 항목·3단계 세부 모두, 태그 시드 전이면 건너뜀)
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
    private final ReviewRepository reviewRepository;
    private final Clock clock;

    /** @return 새로 넣었으면 true, 이미 있으면 false */
    @Transactional
    public boolean seed() {
        Map<String, Tag> tagByName = tagsByName();
        if (userRepository.existsById(DemoSeedData.MARKER)) {
            int relinked = relinkMateTags(tagByName);
            int renamed = renamePastTravelers();
            int reviews = seedReviews(LocalDateTime.now(clock));
            log.info("demo seed: already present, re-linked tastes of {} mates, renamed {} travelers, added {} reviews",
                    relinked, renamed, reviews);
            return false;
        }
        LocalDateTime now = LocalDateTime.now(clock);

        List<PastTraveler> pastTravelers = pastTravelers(now);
        int maps = 0;
        int spots = 0;
        for (MateSeed m : DemoSeedData.MATES) {
            User mate = User.register(m.id(), "KR", 0, now.minusDays(60));
            mate.registerProfile(m.nickname(), m.gender(), m.birthYear(), null, m.bio());
            mate.verify();
            userRepository.save(mate);
            attachTags(mate.getId(), m.tagNamesKo(), tagByName);
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
        int reviews = seedReviews(now);
        log.info("demo seed: {} mates, {} maps, {} spots, {} reviews", DemoSeedData.MATES.size(), maps, spots, reviews);
        return true;
    }

    /** 2단계 항목과 3단계 세부를 한국어 이름으로 찾는다 (이름은 V4 시드에서 겹치지 않는다) */
    private Map<String, Tag> tagsByName() {
        return tagRepository.findAll().stream()
                .filter(t -> t.getDepth() >= 2)
                .collect(Collectors.toMap(Tag::getNameKo, Function.identity(), (a, b) -> a));
    }

    private void attachTags(java.util.UUID mateId, List<String> names, Map<String, Tag> tagByName) {
        for (String name : names) {
            Tag tag = tagByName.get(name);
            if (tag != null) userTagRepository.save(UserTag.of(mateId, tag.getId()));
        }
    }

    /** 이미 들어간 시연 메이트의 취향을 지금 태그로 다시 붙인다. @return 다시 붙인 메이트 수 */
    private int relinkMateTags(Map<String, Tag> tagByName) {
        int count = 0;
        for (MateSeed m : DemoSeedData.MATES) {
            if (!userRepository.existsById(m.id())) continue;
            userTagRepository.deleteAllByUserId(m.id());
            attachTags(m.id(), m.tagNamesKo(), tagByName);
            count++;
        }
        return count;
    }

    private record PastTraveler(User user, Long tripId) {
    }

    /** 지난 여행을 마친 여행자들 (화면에는 나오지 않고 선택 횟수에만 쓰인다) */
    private List<PastTraveler> pastTravelers(LocalDateTime now) {
        List<PastTraveler> travelers = new ArrayList<>();
        LocalDate start = now.toLocalDate().minusDays(40);
        for (int i = 1; i <= PAST_TRAVELERS; i++) {
            User t = User.register(pastTravelerId(i), "JP", 5, now.minusDays(50));
            t.registerProfile(pastTravelerName(i), i % 2 == 0 ? Gender.MALE : Gender.FEMALE, 1996 + i, null, null);
            t.verify();
            userRepository.save(t);
            Trip trip = tripRepository.save(Trip.of(t.getId(), start, start.plusDays(3), now.minusDays(45)));
            travelers.add(new PastTraveler(t, trip.getId()));
        }
        return travelers;
    }

    private static UUID pastTravelerId(int i) {
        return UUID.fromString(String.format("00000000-0000-4000-8000-00000000e%03d", i));
    }

    /** 디자인 시안 이름. 이미 다른 사용자가 쓰고 있으면 예전 이름(seed旅人n)을 쓴다 */
    private String pastTravelerName(int i) {
        String name = DemoSeedData.PAST_TRAVELER_NAMES.get((i - 1) % DemoSeedData.PAST_TRAVELER_NAMES.size());
        return userRepository.existsByNickname(name) ? "seed旅人" + i : name;
    }

    /** 예전 시드(seed旅人n)로 들어간 지난 여행자 이름을 시안 이름으로 바꾼다. @return 바꾼 수 */
    private int renamePastTravelers() {
        int count = 0;
        for (int i = 1; i <= PAST_TRAVELERS; i++) {
            User t = userRepository.findById(pastTravelerId(i)).orElse(null);
            if (t == null || !("seed旅人" + i).equals(t.getNickname())) continue;
            String name = pastTravelerName(i);
            if (name.equals(t.getNickname())) continue;
            t.updateProfile(name, null, null);
            count++;
        }
        return count;
    }

    /** 시연 메이트의 지난 여행(완료)마다 여행자 후기를 하나씩. 이미 있으면 건너뛴다. @return 새로 넣은 수 */
    private int seedReviews(LocalDateTime now) {
        int added = 0;
        int k = 0;
        for (MateSeed m : DemoSeedData.MATES) {
            List<Match> past = new ArrayList<>(matchRepository.findMine(m.id(), List.of(MatchStatus.COMPLETED)));
            past.sort(java.util.Comparator.comparing(Match::getId));
            for (Match match : past) {
                ReviewSeed rs = DemoSeedData.REVIEWS.get(k % DemoSeedData.REVIEWS.size());
                k++;
                if (!match.getMateId().equals(m.id()) || !isPastTraveler(match.getTravelerId())) continue;
                if (reviewRepository.existsByMatchIdAndReviewerId(match.getId(), match.getTravelerId())) continue;
                LocalDateTime base = match.getEndedAt() == null ? now.minusDays(30) : match.getEndedAt();
                Review r = Review.of(match.getId(), match.getTravelerId(), m.id(), rs.rating(), rs.ja(),
                        base.plusHours(k));   // 같은 날 끝난 여행도 목록 순서가 정해지게
                r.fillTranslation(rs.ko());
                reviewRepository.save(r);
                added++;
            }
        }
        return added;
    }

    private static boolean isPastTraveler(UUID userId) {
        for (int i = 1; i <= PAST_TRAVELERS; i++) {
            if (pastTravelerId(i).equals(userId)) return true;
        }
        return false;
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
