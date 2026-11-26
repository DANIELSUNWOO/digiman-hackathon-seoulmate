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
import server.global.security.AuthUser;
import server.map.repository.SecretMapRepository;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.service.MatchAccess;
import server.user.domain.User;
import server.user.repository.UserRepository;
import server.visit.service.VisitService;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * [서버 B] 앨범·상호 후기 (ALBUM-01·02, REVIEW-01·02, F-33·F-34).
 * - 앨범은 여행 완료 때 서버 A가 AlbumService.createForMatch 로 만든다. 내용은 따로 저장하지 않고 방문 기록·리액션을 모아 보여 준다
 * - 후기는 여행 완료(COMPLETED) 뒤에만, 매칭마다 한 사람당 한 번. 받는 사람은 매칭 상대로 자동 지정
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

    /** REVIEW-01 상호 후기 작성. 여행 완료 뒤 한 번만 */
    @Transactional
    public ReviewCreated review(AuthUser me, Long matchId, ReviewRequest req) {
        Match m = matchAccess.member(matchId, me);
        if (m.getStatus() != MatchStatus.COMPLETED) throw new ApiException(ErrorCode.MATCH_NOT_COMPLETED);
        if (reviewRepository.existsByMatchIdAndReviewerId(matchId, me.id())) {
            throw new ApiException(ErrorCode.ALREADY_REVIEWED);
        }
        String content = req.content() == null || req.content().isBlank() ? null : req.content().trim();
        try {
            Review r = reviewRepository.saveAndFlush(
                    Review.of(matchId, me.id(), m.partnerOf(me.id()), req.rating(), content, LocalDateTime.now(clock)));
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
                    // reviews 테이블에 번역 칸이 없어 원문만 내려준다 (translated = null)
                    LocalizedText.of(r.getContent(), null, reviewer == null ? null : reviewer.getLanguage()),
                    Times.kst(r.getCreatedAt()));
        }).toList();
    }

    // ---------- 내부 ----------

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
}
