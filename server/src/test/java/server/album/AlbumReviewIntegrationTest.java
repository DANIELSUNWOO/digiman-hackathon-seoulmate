package server.album;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import server.album.repository.ReviewRepository;
import server.album.service.AlbumReviewService;
import server.album.service.AlbumReviewService.AlbumPatch;
import server.album.service.AlbumReviewService.ReviewRequest;
import server.album.service.AlbumService;
import server.global.error.ApiException;
import server.global.event.TranslationTarget;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.match.domain.Match;
import server.match.repository.MatchRepository;
import server.safety.domain.Block;
import server.safety.domain.ReportReason;
import server.safety.repository.BlockRepository;
import server.translation.TranslationWriter;
import server.trip.domain.Trip;
import server.trip.repository.TripRepository;
import server.user.domain.Gender;
import server.user.domain.User;
import server.user.repository.UserRepository;
import server.visit.service.VisitService;
import server.visit.service.VisitService.CommentRequest;
import server.visit.service.VisitService.ReactionRequest;
import server.visit.service.VisitService.VisitRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** ALBUM-01·02, REVIEW-01·02 통합 테스트 (H2) */
@SpringBootTest
@ActiveProfiles("test")
class AlbumReviewIntegrationTest {

    @Autowired AlbumReviewService albumReviewService;
    @Autowired AlbumService albumService;
    @Autowired VisitService visitService;
    @Autowired UserRepository userRepository;
    @Autowired TripRepository tripRepository;
    @Autowired MatchRepository matchRepository;
    @Autowired SecretMapRepository mapRepository;
    @Autowired SpotRepository spotRepository;
    @Autowired ReviewRepository reviewRepository;
    @Autowired BlockRepository blockRepository;
    @Autowired TranslationWriter translationWriter;

    private static final BigDecimal SPOT_LAT = new BigDecimal("37.5447000");
    private static final BigDecimal SPOT_LNG = new BigDecimal("127.0582000");

    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
    private final LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

    private User user(String country) {
        User u = User.register(UUID.randomUUID(), country, 5, now);
        u.registerProfile((country + UUID.randomUUID()).substring(0, 12), Gender.MALE, 1995, null, null);
        u.verify();
        return userRepository.save(u);
    }

    private static AuthUser auth(User u) {
        return new AuthUser(u.getId(), u.getRole(), null);
    }

    private record Fixture(User traveler, User mate, Long matchId, Long mapId, List<Long> spotIds) {}

    /** 5곳 지도를 코스로 고르고 3곳을 인증한 매칭 (사진 = https://img/0.jpg, 1.jpg, 2.jpg 순) */
    private Fixture visited() {
        return visited(user("KR"));
    }

    private Fixture visited(User mate) {
        User traveler = user("JP");
        SecretMap map = mapRepository.save(SecretMap.of(mate.getId(), "혼자 가기 좋은 성수 카페", null, now));
        List<Long> spotIds = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            Spot s = Spot.of(map.getId(), "스팟" + i, null, SPOT_LAT, SPOT_LNG, null, null, null, i);
            s.setPreview(i < 2);
            spotIds.add(spotRepository.save(s).getId());
        }
        Trip trip = tripRepository.save(Trip.of(traveler.getId(), today, today.plusDays(3), now));
        Match m = Match.create(trip.getId(), traveler.getId(), mate.getId(), map.getId(), 3, now);
        m = matchRepository.save(m);
        for (int i = 0; i < 3; i++) {
            visitService.verify(auth(traveler), m.getId(),
                    new VisitRequest(spotIds.get(i), "https://img/" + i + ".jpg", "後記" + i, 37.5449, 127.0580));
        }
        return new Fixture(traveler, mate, m.getId(), map.getId(), spotIds);
    }

    /** 서버 A의 여행 완료(MATCH-08)와 같은 순서: 상태 변경 → 앨범 생성 */
    private Long complete(Fixture f, String title) {
        Match m = matchRepository.findById(f.matchId()).orElseThrow();
        m.complete(now);
        matchRepository.save(m);
        return albumService.createForMatch(f.matchId(), title, null);
    }

    private static void assertError(Runnable call, ErrorCode code) {
        assertThatThrownBy(call::run).isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode()).isEqualTo(code);
    }

    @Test
    void 앨범은_지도_이름과_첫_인증_사진으로_만들어지고_방문_기록을_모아_보여준다() {
        Fixture f = visited();
        assertError(() -> albumReviewService.album(auth(f.traveler()), f.matchId()), ErrorCode.ALBUM_NOT_FOUND);

        Long albumId = complete(f, " ");                                    // 빈 제목 = 기본값
        assertThat(albumService.createForMatch(f.matchId(), "다른 제목", null)).isEqualTo(albumId);   // 두 번 불러도 하나

        var album = albumReviewService.album(auth(f.mate()), f.matchId());
        assertThat(album.albumId()).isEqualTo(albumId);
        assertThat(album.title()).isEqualTo("혼자 가기 좋은 성수 카페");
        assertThat(album.coverUrl()).isEqualTo("https://img/0.jpg");
        assertThat(album.map().mapId()).isEqualTo(f.mapId());
        assertThat(album.traveler().userId()).isEqualTo(f.traveler().getId());
        assertThat(album.mate().userId()).isEqualTo(f.mate().getId());
        assertThat(album.items()).hasSize(3);
        assertThat(album.items().get(0).photoUrl()).isEqualTo("https://img/2.jpg");   // 최근 인증 순

        var edited = albumReviewService.editAlbum(auth(f.traveler()), f.matchId(),
                new AlbumPatch(" はじめてのソウルカフェ旅 ", null));
        assertThat(edited.title()).isEqualTo("はじめてのソウルカフェ旅");
        assertThat(edited.coverUrl()).isEqualTo("https://img/0.jpg");     // 안 보낸 값은 그대로

        assertError(() -> albumReviewService.editAlbum(auth(f.mate()), f.matchId(), new AlbumPatch("x", null)),
                ErrorCode.ROLE_FORBIDDEN);
        assertError(() -> albumReviewService.editAlbum(auth(f.traveler()), f.matchId(), new AlbumPatch(" ", null)),
                ErrorCode.VALIDATION_ERROR);
        Fixture other = visited();
        assertError(() -> albumReviewService.album(auth(other.traveler()), f.matchId()), ErrorCode.NOT_MATCH_MEMBER);
    }

    @Test
    void 후기는_여행_완료_뒤_한_사람당_한_번이고_받는_사람은_상대다() {
        Fixture f = visited();
        AuthUser traveler = auth(f.traveler());
        AuthUser mate = auth(f.mate());

        assertError(() -> albumReviewService.review(traveler, f.matchId(), new ReviewRequest(5, "最高")),
                ErrorCode.MATCH_NOT_COMPLETED);

        complete(f, null);
        albumReviewService.review(traveler, f.matchId(), new ReviewRequest(5, " おかげで最高の旅になりました "));
        assertError(() -> albumReviewService.review(traveler, f.matchId(), new ReviewRequest(4, "もう一度")),
                ErrorCode.ALREADY_REVIEWED);
        albumReviewService.review(mate, f.matchId(), new ReviewRequest(4, null));

        var reviews = albumReviewService.reviews(mate, f.matchId());
        assertThat(reviews).hasSize(2);
        assertThat(reviews.get(0).reviewer().userId()).isEqualTo(f.traveler().getId());
        assertThat(reviews.get(0).rating()).isEqualTo(5);
        assertThat(reviews.get(0).content().original()).isEqualTo("おかげで最高の旅になりました");
        assertThat(reviews.get(0).content().sourceLang()).isEqualTo("ja");
        assertThat(reviews.get(1).content()).isNull();

        var saved = reviewRepository.findByMatchIdOrderByIdAsc(f.matchId());
        assertThat(saved.get(0).getRevieweeId()).isEqualTo(f.mate().getId());
        assertThat(saved.get(1).getRevieweeId()).isEqualTo(f.traveler().getId());

        Fixture other = visited();
        assertError(() -> albumReviewService.reviews(auth(other.mate()), f.matchId()), ErrorCode.NOT_MATCH_MEMBER);
    }

    @Test
    void 여행이_끝난_뒤_차단하면_리액션과_후기를_남길_수_없다() {
        Fixture f = visited();
        complete(f, null);
        Long visitId = visitService.list(auth(f.mate()), f.matchId()).get(0).visitId();

        // 완료 뒤 차단: 매칭 상태는 COMPLETED 로 남고 차단 관계만 저장된다 (서버 A BLOCK-01)
        blockRepository.save(Block.of(f.traveler().getId(), f.mate().getId(), f.matchId(), ReportReason.ABUSIVE, null, now));

        assertError(() -> visitService.setReaction(auth(f.mate()), visitId, new ReactionRequest("LIKE")),
                ErrorCode.MATCH_NOT_ACTIVE);
        assertError(() -> visitService.comment(auth(f.mate()), visitId, new CommentRequest("안녕")),
                ErrorCode.MATCH_NOT_ACTIVE);
        assertError(() -> albumReviewService.review(auth(f.mate()), f.matchId(), new ReviewRequest(1, null)),
                ErrorCode.MATCH_NOT_ACTIVE);
        assertError(() -> albumReviewService.review(auth(f.traveler()), f.matchId(), new ReviewRequest(5, null)),
                ErrorCode.MATCH_NOT_ACTIVE);
        assertThat(albumReviewService.album(auth(f.traveler()), f.matchId()).items()).hasSize(3);   // 앨범은 그대로 볼 수 있다
    }

    @Test
    void 기간_만료된_매칭도_후기를_남기고_취소된_매칭은_못_남긴다() {
        Fixture expired = visited();
        Match m = matchRepository.findById(expired.matchId()).orElseThrow();
        m.expire(now);
        matchRepository.save(m);
        albumService.createForMatch(expired.matchId(), null, null);      // 자동 종료 배치와 같은 순서
        albumReviewService.review(auth(expired.traveler()), expired.matchId(), new ReviewRequest(3, "またいつか"));
        assertThat(albumReviewService.reviews(auth(expired.mate()), expired.matchId())).hasSize(1);

        Fixture canceled = visited();
        Match c = matchRepository.findById(canceled.matchId()).orElseThrow();
        c.cancel(canceled.traveler().getId(), null, null, now);
        matchRepository.save(c);
        assertError(() -> albumReviewService.review(auth(canceled.traveler()), canceled.matchId(), new ReviewRequest(3, null)),
                ErrorCode.MATCH_NOT_COMPLETED);
    }

    @Test
    void 받은_후기_모음은_평균_분포_최근_순이고_차단한_상대의_후기는_뺀다() {
        User mate = user("KR");
        Fixture first = visited(mate);
        Fixture second = visited(mate);
        Fixture third = visited(mate);
        complete(first, null);
        complete(second, null);
        complete(third, null);

        Long firstReview = albumReviewService.review(auth(first.traveler()), first.matchId(),
                new ReviewRequest(5, "窓際の席が最高でした")).reviewId();
        albumReviewService.review(auth(second.traveler()), second.matchId(), new ReviewRequest(4, null));
        albumReviewService.review(auth(third.traveler()), third.matchId(), new ReviewRequest(4, "また行きたい"));
        albumReviewService.review(auth(mate), first.matchId(), new ReviewRequest(5, "또 안내하고 싶어요"));   // 메이트가 쓴 후기는 메이트 목록에 없다

        // 번역 스레드가 채운 것과 같은 결과 (테스트에서는 LLM 키가 없어 직접 채운다)
        assertThat(translationWriter.fill(TranslationTarget.REVIEW_CONTENT, firstReview, "窓際の席が最高でした",
                "창가 자리가 최고였어요")).isTrue();
        assertThat(translationWriter.fill(TranslationTarget.REVIEW_CONTENT, firstReview, "예전 글", "x")).isFalse();

        var received = albumReviewService.received(auth(mate));
        assertThat(received.count()).isEqualTo(3);
        assertThat(received.average()).isEqualByComparingTo("4.3");
        assertThat(received.distribution()).extracting(AlbumReviewService.StarCount::rating).containsExactly(5, 4, 3, 2, 1);
        assertThat(received.distribution()).extracting(AlbumReviewService.StarCount::count).containsExactly(1, 2, 0, 0, 0);
        assertThat(received.items()).extracting(AlbumReviewService.ReceivedReview::matchId)
                .containsExactly(third.matchId(), second.matchId(), first.matchId());          // 최근 순
        var oldest = received.items().get(2);
        assertThat(oldest.reviewer().userId()).isEqualTo(first.traveler().getId());
        assertThat(oldest.content().original()).isEqualTo("窓際の席が最高でした");
        assertThat(oldest.content().translated()).isEqualTo("창가 자리가 최고였어요");
        assertThat(oldest.content().sourceLang()).isEqualTo("ja");
        assertThat(oldest.map().mapId()).isEqualTo(first.mapId());
        assertThat(oldest.map().title().original()).isEqualTo("혼자 가기 좋은 성수 카페");
        assertThat(received.items().get(1).content()).isNull();                                  // 별점만 남긴 후기

        // 매칭 안의 후기 보기(REVIEW-02)도 번역을 함께 내려준다
        assertThat(albumReviewService.reviews(auth(mate), first.matchId()).get(0).content().translated())
                .isEqualTo("창가 자리가 최고였어요");

        // 여행자도 같은 API: 메이트가 남긴 후기 1건
        var travelerSide = albumReviewService.received(auth(first.traveler()));
        assertThat(travelerSide.count()).isEqualTo(1);
        assertThat(travelerSide.average()).isEqualByComparingTo("5.0");
        assertThat(travelerSide.items().get(0).content().sourceLang()).isEqualTo("ko");

        // 지금 차단 관계인 상대의 후기는 목록·통계에서 빠진다
        blockRepository.save(Block.of(mate.getId(), third.traveler().getId(), third.matchId(), ReportReason.ABUSIVE, null, now));
        var afterBlock = albumReviewService.received(auth(mate));
        assertThat(afterBlock.count()).isEqualTo(2);
        assertThat(afterBlock.average()).isEqualByComparingTo("4.5");

        // 받은 후기가 없으면 평균은 null, 분포는 모두 0
        var empty = albumReviewService.received(auth(user("KR")));
        assertThat(empty.count()).isZero();
        assertThat(empty.average()).isNull();
        assertThat(empty.distribution()).extracting(AlbumReviewService.StarCount::count).containsOnly(0);
        assertThat(empty.items()).isEmpty();
    }
}
