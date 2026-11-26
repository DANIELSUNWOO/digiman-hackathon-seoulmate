package server.visit.service;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.global.common.LocalizedText;
import server.global.common.Times;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.event.TranslationTarget;
import server.global.security.AuthUser;
import server.map.domain.Spot;
import server.map.repository.SpotRepository;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.service.MatchAccess;
import server.match.service.MatchProgressService;
import server.notification.domain.NotificationType;
import server.notification.service.NotificationPublisher;
import server.safety.repository.BlockRepository;
import server.translation.TranslationService;
import server.visit.domain.SpotVisit;
import server.visit.domain.VisitReaction;
import server.visit.repository.SpotVisitRepository;
import server.visit.repository.VisitReactionRepository;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * [서버 B] 방문 인증·방문 기록·리액션 (VISIT-01~03, F-26~F-29).
 * - 여행자 좌표는 거리 계산에만 쓰고 저장하지 않는다 (VisitLocationVerifier)
 * - 인증은 바로 메이트에게 공개되고 VISIT 알림이 간다
 * - 인증 수가 required_visits 에 처음 닿으면 서버 A(MatchProgressService)가 채팅 요청으로 바꾼다
 * - 여행자 후기는 일본어 → 한국어, 메이트 댓글은 한국어 → 일본어로 비동기 번역
 */
@Service
@RequiredArgsConstructor
public class VisitService {

    static final String TRAVELER_LANG = "ja";
    static final String MATE_LANG = "ko";

    private final MatchAccess matchAccess;
    private final MatchProgressService matchProgressService;
    private final NotificationPublisher notificationPublisher;
    private final TranslationService translationService;
    private final VisitLocationVerifier locationVerifier;
    private final SpotVisitRepository visitRepository;
    private final VisitReactionRepository reactionRepository;
    private final SpotRepository spotRepository;
    private final BlockRepository blockRepository;
    private final Clock clock;

    /** VISIT-01 방문 인증. 매칭 행을 잠그고 처리해서 같은 매칭의 인증·취소·완료가 겹치지 않게 한다 */
    @Transactional
    public VisitCreated verify(AuthUser me, Long matchId, VisitRequest req) {
        Match m = matchAccess.travelerMember(matchId, me, true);
        if (m.getStatus() != MatchStatus.ON_COURSE) throw new ApiException(ErrorCode.MATCH_NOT_ON_COURSE);

        Spot spot = spotRepository.findById(req.spotId())
                .filter(s -> s.getMapId().equals(m.getCourseMapId()))
                .orElseThrow(() -> new ApiException(ErrorCode.SPOT_NOT_IN_COURSE));
        if (visitRepository.existsByMatchIdAndSpotId(matchId, spot.getId())) {
            throw new ApiException(ErrorCode.ALREADY_VISITED);
        }
        locationVerifier.verify(req.lat(), req.lng(), spot.getLat(), spot.getLng());

        SpotVisit visit = visitRepository.saveAndFlush(
                SpotVisit.of(matchId, spot.getId(), req.photoUrl().trim(), req.review().trim(), now()));
        translationService.translateAsync(TranslationTarget.VISIT_REVIEW, visit.getId(), visit.getReview(),
                TRAVELER_LANG, MATE_LANG);
        notificationPublisher.publish(m.getMateId(), NotificationType.VISIT, matchId, spot.getName());

        boolean chatReady = matchProgressService.onVisitVerified(matchId);   // 필요 인증 수에 처음 닿으면 true (READY)
        Progress progress = new Progress(visitRepository.countByMatchId(matchId), m.getRequiredVisits(),
                spotRepository.countByMapId(m.getCourseMapId()));
        return new VisitCreated(visit.getId(), spot.getId(), Times.kst(visit.getVerifiedAt()), progress, chatReady);
    }

    /** VISIT-02 방문 기록 목록 (최근 인증 순, 리액션 포함). 위치 정보는 내려주지 않는다 */
    @Transactional(readOnly = true)
    public List<VisitView> list(AuthUser me, Long matchId) {
        matchAccess.member(matchId, me);
        List<SpotVisit> visits = visitRepository.findByMatchIdOrderByVerifiedAtDescIdDesc(matchId);
        if (visits.isEmpty()) return List.of();

        Map<Long, String> spotNames = spotRepository.findAllById(visits.stream().map(SpotVisit::getSpotId).toList())
                .stream().collect(Collectors.toMap(Spot::getId, Spot::getName));
        // visit_reactions 한 테이블에 리액션(emoji 행)과 댓글(comment 행)이 함께 있다
        List<VisitReaction> rows = reactionRepository.findByVisitIdInOrderByIdAsc(visits.stream().map(SpotVisit::getId).toList());
        Map<Long, String> reactionByVisit = new HashMap<>();
        rows.stream().filter(VisitReaction::isReaction).forEach(r -> reactionByVisit.putIfAbsent(r.getVisitId(), r.getEmoji()));
        Map<Long, List<CommentView>> commentsByVisit = rows.stream().filter(VisitReaction::isComment)
                .collect(Collectors.groupingBy(VisitReaction::getVisitId,
                        Collectors.mapping(VisitService::commentView, Collectors.toList())));

        return visits.stream().map(v -> new VisitView(
                v.getId(),
                new SpotRef(v.getSpotId(), spotNames.get(v.getSpotId())),
                v.getPhotoUrl(),
                LocalizedText.of(v.getReview(), v.getReviewTranslated(), TRAVELER_LANG),
                Times.kst(v.getVerifiedAt()),
                reactionByVisit.get(v.getId()),
                commentsByVisit.getOrDefault(v.getId(), List.of()))).toList();
    }

    /** VISIT-03 리액션 누르기·바꾸기 (방문 기록당 1개). 처음 누를 때만 여행자에게 REACTION 알림 */
    @Transactional
    public ReactionResult setReaction(AuthUser me, Long visitId, ReactionRequest req) {
        ReactionType type = ReactionType.from(req.type());
        Target t = writableTarget(me, visitId);
        Optional<VisitReaction> current = currentReaction(visitId);
        if (current.isPresent()) {
            current.get().changeReaction(type.name());
        } else {
            reactionRepository.save(VisitReaction.reaction(visitId, me.id(), type.name(), now()));
            notificationPublisher.publish(t.match().getTravelerId(), NotificationType.REACTION, t.match().getId());
        }
        return new ReactionResult(visitId, type.name());
    }

    /** VISIT-04 리액션 해제. 이미 없으면 그대로 204 */
    @Transactional
    public void clearReaction(AuthUser me, Long visitId) {
        writableTarget(me, visitId);
        currentReaction(visitId).ifPresent(reactionRepository::delete);
    }

    /** VISIT-05 댓글. 일본어로 번역하고 여행자에게 REACTION 알림 */
    @Transactional
    public CommentCreated comment(AuthUser me, Long visitId, CommentRequest req) {
        String content = blankToNull(req.content());
        if (content == null) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        Target t = writableTarget(me, visitId);
        VisitReaction c = reactionRepository.save(VisitReaction.comment(visitId, me.id(), content, now()));
        translationService.translateAsync(TranslationTarget.REACTION_COMMENT, c.getId(), content, MATE_LANG, TRAVELER_LANG);
        notificationPublisher.publish(t.match().getTravelerId(), NotificationType.REACTION, t.match().getId());
        return new CommentCreated(c.getId());
    }

    /**
     * 리액션·댓글을 남길 수 있는 방문 기록인지 확인한다: 그 매칭의 메이트이고, 차단 관계가 아니어야 한다.
     * 매칭 행을 잠가서 같은 방문 기록에 리액션이 두 개 생기지 않게 한다.
     */
    private Target writableTarget(AuthUser me, Long visitId) {
        SpotVisit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new ApiException(ErrorCode.VISIT_NOT_FOUND));
        Match m = matchAccess.mateMember(visit.getMatchId(), me, true);
        // 여행이 끝난 뒤 차단하면 매칭 상태는 COMPLETED 로 남으므로 차단 관계도 확인한다
        if (m.getStatus() == MatchStatus.BLOCKED || blockRepository.existsBetween(m.getTravelerId(), m.getMateId())) {
            throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        }
        return new Target(visit, m);
    }

    private record Target(SpotVisit visit, Match match) {}

    private Optional<VisitReaction> currentReaction(Long visitId) {
        return reactionRepository.findByVisitIdInOrderByIdAsc(List.of(visitId)).stream()
                .filter(VisitReaction::isReaction)
                .findFirst();
    }

    // ---------- 내부 ----------

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static CommentView commentView(VisitReaction r) {
        return new CommentView(r.getId(), LocalizedText.of(r.getComment(), r.getCommentTranslated(), MATE_LANG),
                Times.kst(r.getCreatedAt()));
    }

    // ---------- 요청·응답 ----------

    /** lat·lng 는 위치 권한을 거부하면 비어 올 수 있어 null 허용 (서비스에서 LOCATION_REQUIRED) */
    public record VisitRequest(@NotNull Long spotId,
                               @NotBlank @Size(max = 500) String photoUrl,
                               @NotBlank @Size(max = 500) String review,
                               Double lat,
                               Double lng) {}

    public record Progress(long visited, Integer required, long total) {}

    public record VisitCreated(Long visitId, Long spotId, OffsetDateTime verifiedAt, Progress progress,
                               boolean chatReady) {}

    public record SpotRef(Long spotId, String name) {}

    public record CommentView(Long commentId, LocalizedText content, OffsetDateTime createdAt) {}

    public record VisitView(Long visitId, SpotRef spot, String photoUrl, LocalizedText review,
                            OffsetDateTime verifiedAt, String reaction, List<CommentView> comments) {}

    /** 메이트 리액션 3종 (M-23 좋아요·웃음·응원) */
    public enum ReactionType {
        LIKE, LAUGH, CHEER;

        static ReactionType from(String value) {
            if (value == null || value.isBlank()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
            try {
                return valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR);
            }
        }
    }

    public record ReactionRequest(String type) {}

    public record ReactionResult(Long visitId, String reaction) {}

    public record CommentRequest(@Size(max = 300) String content) {}

    public record CommentCreated(Long commentId) {}
}
