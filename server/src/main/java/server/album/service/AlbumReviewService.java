package server.album.service;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.album.domain.Album;
import server.album.domain.Review;
import server.album.repository.AlbumRepository;
import server.album.repository.ReviewRepository;
import server.global.common.LocalizedText;
import server.global.common.Times;
import server.global.common.UserSummary;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.event.TranslationTarget;
import server.global.security.AuthUser;
import server.map.repository.SecretMapRepository;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.service.MatchAccess;
import server.map.domain.SecretMap;
import server.match.repository.MatchRepository;
import server.safety.repository.BlockRepository;
import server.translation.TranslationService;
import server.user.domain.User;
import server.user.repository.UserRepository;
import server.visit.service.VisitService;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * [서버 B] 앨범·상호 후기 (ALBUM-01·02, REVIEW-01·02, F-33·F-34).
 * - 앨범은 여행 완료 때 서버 A가 AlbumService.createForMatch 로 만든다. 내용은 따로 저장하지 않고 방문 기록·리액션을 모아 보여 준다
 * - 후기는 여행이 끝난 뒤(COMPLETED·EXPIRED)에만, 매칭마다 한 사람당 한 번. 받는 사람은 매칭 상대로 자동 지정. 차단 관계면 불가
 * - 후기 글은 받는 사람 언어로 번역해 둔다 (V5 content_translated)
 * - 받은 후기 모음(C-02a, 11/26 추가): 평균 별점·별 개수별 분포·최근 순 목록. 여행자·메이트 같은 구성
 */
@Service
@RequiredArgsConstructor
public class AlbumReviewService {

    private final MatchAccess matchAccess;
    private final AlbumRepository albumRepository;
    private final ReviewRepository reviewRepository;
    private final SecretMapRepository mapRepository;
    private final UserRepository userRepository;
    private final VisitService visitService;
    private final BlockRepository blockRepository;
    private final MatchRepository matchRepository;
    private final TranslationService translationService;
    private final Clock clock;

    // ---------- 앨범 ----------

    /** ALBUM-01 앨범 보기 (당사자) */
    @Transactional(readOnly = true)
    public AlbumView album(AuthUser me, Long matchId) {
        Match m = matchAccess.member(matchId, me);
        Album album = albumRepository.findByMatchId(matchId)
                .orElseThrow(() -> new ApiException(ErrorCode.ALBUM_NOT_FOUND));
        MapRef map = m.getCourseMapId() == null ? null
                : mapRepository.findById(m.getCourseMapId()).map(s -> new MapRef(s.getId(), s.getTitle())).orElse(null);
        LocalDate today = LocalDate.now(clock);
        return new AlbumView(album.getId(), album.getTitle(), album.getCoverUrl(), Times.kst(album.getCreatedAt()),
                summary(m.getTravelerId(), today), summary(m.getMateId(), today), map,
                visitService.list(me, matchId));
    }

    /** ALBUM-02 앨범 제목·표지 수정 (여행자, 보낸 값만) */
    @Transactional
    public AlbumView editAlbum(AuthUser me, Long matchId, AlbumPatch req) {
        matchAccess.travelerMember(matchId, me, false);
        Album album = albumRepository.findByMatchId(matchId)
                .orElseThrow(() -> new ApiException(ErrorCode.ALBUM_NOT_FOUND));
        String title = req.title() == null ? null : req.title().trim();
        String cover = req.coverUrl() == null ? null : req.coverUrl().trim();
        if ((title != null && title.isEmpty()) || (cover != null && cover.isEmpty())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        album.edit(title, cover);
        return album(me, matchId);
    }

    // ---------- 후기 ----------

    /** REVIEW-01 상호 후기 작성. 여행이 끝나 앨범이 생긴 매칭(완료·기간 만료)에서 한 번만 */
    @Transactional
    public ReviewCreated review(AuthUser me, Long matchId, ReviewRequest req) {
        Match m = matchAccess.member(matchId, me);
        // 화면 명세 v9: 기간 만료(T-91)도 앨범(T-31) → 후기(T-32)로 이어진다. 취소·차단·진행 중은 불가
        if (m.getStatus() != MatchStatus.COMPLETED && m.getStatus() != MatchStatus.EXPIRED) {
            throw new ApiException(ErrorCode.MATCH_NOT_COMPLETED);
        }
        // 완료 뒤 어느 한쪽이 차단했으면 후기를 남기지 않는다 (차단당한 쪽 의견은 BLOCK-03 으로)
        if (blockRepository.existsBetween(m.getTravelerId(), m.getMateId())) {
            throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        }
        if (reviewRepository.existsByMatchIdAndReviewerId(matchId, me.id())) {
            throw new ApiException(ErrorCode.ALREADY_REVIEWED);
        }
        String content = req.content() == null || req.content().isBlank() ? null : req.content().trim();
        try {
            UUID revieweeId = m.partnerOf(me.id());
            Review r = reviewRepository.saveAndFlush(
                    Review.of(matchId, me.id(), revieweeId, req.rating(), content, LocalDateTime.now(clock)));
            String from = languageOf(me.id());
            String to = languageOf(revieweeId);
            if (content != null && from != null && to != null) {   // 커밋 뒤 비동기로 받는 사람 언어로 (같은 언어면 건너뜀)
                translationService.translateAsync(TranslationTarget.REVIEW_CONTENT, r.getId(), content, from, to);
            }
            return new ReviewCreated(r.getId());
        } catch (DataIntegrityViolationException e) {   // 동시에 두 번 눌렀을 때 (uk_review_match_reviewer)
            throw new ApiException(ErrorCode.ALREADY_REVIEWED);
        }
    }

    /** REVIEW-02 후기 보기 (당사자, 작성 순) */
    @Transactional(readOnly = true)
    public List<ReviewView> reviews(AuthUser me, Long matchId) {
        matchAccess.member(matchId, me);
        List<Review> reviews = reviewRepository.findByMatchIdOrderByIdAsc(matchId);
        Map<UUID, User> users = userRepository.findAllById(reviews.stream().map(Review::getReviewerId).toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        LocalDate today = LocalDate.now(clock);
        return reviews.stream().map(r -> {
            User reviewer = users.get(r.getReviewerId());
            return new ReviewView(r.getId(), reviewer == null ? null : UserSummary.of(reviewer, today), r.getRating(),
                    LocalizedText.of(r.getContent(), r.getContentTranslated(), reviewer == null ? null : reviewer.getLanguage()),
                    Times.kst(r.getCreatedAt()));
        }).toList();
    }

    /**
     * C-02a 받은 후기 모음 (여행자·메이트 공통). 마이페이지 별점 버튼에서 연다.
     * - 평균은 소수 첫째 자리, 후기가 없으면 null. 분포는 5점 → 1점 순으로 다섯 칸 모두
     * - 지금 차단 관계인 상대의 후기는 목록과 통계 모두에서 뺀다 (차단 = 서로 보이지 않음)
     */
    @Transactional(readOnly = true)
    public ReceivedReviews received(AuthUser me) {
        Set<UUID> blocked = new HashSet<>(blockRepository.findBlockedRelations(me.id()));
        List<Review> reviews = reviewRepository.findByRevieweeIdOrderByCreatedAtDescIdDesc(me.id()).stream()
                .filter(r -> !blocked.contains(r.getReviewerId()))
                .toList();

        Map<UUID, User> users = userRepository.findAllById(reviews.stream().map(Review::getReviewerId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<Long, Match> matches = matchRepository.findAllById(reviews.stream().map(Review::getMatchId).distinct().toList())
                .stream().collect(Collectors.toMap(Match::getId, Function.identity()));
        Map<Long, SecretMap> maps = mapRepository.findAllById(matches.values().stream()
                        .map(Match::getCourseMapId).filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(SecretMap::getId, Function.identity()));

        LocalDate today = LocalDate.now(clock);
        List<ReceivedReview> items = reviews.stream().map(r -> {
            User reviewer = users.get(r.getReviewerId());
            Match match = matches.get(r.getMatchId());
            SecretMap map = match == null || match.getCourseMapId() == null ? null : maps.get(match.getCourseMapId());
            return new ReceivedReview(r.getId(), r.getMatchId(),
                    reviewer == null ? null : UserSummary.of(reviewer, today), r.getRating(),
                    LocalizedText.of(r.getContent(), r.getContentTranslated(), reviewer == null ? null : reviewer.getLanguage()),
                    map == null ? null : new ReviewMapRef(map.getId(),
                            LocalizedText.of(map.getTitle(), map.getTitleTranslated(), MAP_LANG)),
                    Times.kst(r.getCreatedAt()));
        }).toList();

        int[] counts = new int[6];
        reviews.forEach(r -> counts[r.getRating()]++);
        List<StarCount> distribution = List.of(5, 4, 3, 2, 1).stream()
                .map(star -> new StarCount(star, counts[star])).toList();
        BigDecimal average = reviews.isEmpty() ? null
                : BigDecimal.valueOf(reviews.stream().mapToInt(Review::getRating).sum())
                        .divide(BigDecimal.valueOf(reviews.size()), 1, RoundingMode.HALF_UP);
        return new ReceivedReviews(average, reviews.size(), distribution, items);
    }

    // ---------- 내부 ----------

    /** 지도는 메이트(한국어)가 쓴다 */
    private static final String MAP_LANG = "ko";

    private String languageOf(UUID userId) {
        return userRepository.findById(userId).map(User::getLanguage).orElse(null);
    }

    private UserSummary summary(UUID userId, LocalDate today) {
        return userRepository.findById(userId).map(u -> UserSummary.of(u, today)).orElse(null);
    }

    // ---------- 요청·응답 ----------

    public record MapRef(Long mapId, String title) {}

    public record AlbumView(Long albumId, String title, String coverUrl, OffsetDateTime createdAt,
                            UserSummary traveler, UserSummary mate, MapRef map, List<VisitService.VisitView> items) {}

    public record AlbumPatch(@Size(max = 100) String title, @Size(max = 500) String coverUrl) {}

    public record ReviewRequest(@NotNull @Min(1) @Max(5) Integer rating, @Size(max = 300) String content) {}

    public record ReviewCreated(Long reviewId) {}

    public record ReviewView(Long reviewId, UserSummary reviewer, int rating, LocalizedText content,
                             OffsetDateTime createdAt) {}

    public record ReviewMapRef(Long mapId, LocalizedText title) {}

    public record StarCount(int rating, int count) {}

    public record ReceivedReview(Long reviewId, Long matchId, UserSummary reviewer, int rating, LocalizedText content,
                                 ReviewMapRef map, OffsetDateTime createdAt) {}

    public record ReceivedReviews(BigDecimal average, int count, List<StarCount> distribution,
                                  List<ReceivedReview> items) {}
}
