package server.safety.service;

import java.util.UUID;

import server.chat.repository.ChatMessageRepository;
import server.global.common.Times;
import server.global.common.UserSummary;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;
import server.match.domain.Match;
import server.match.service.MatchAccess;
import server.safety.domain.Block;
import server.safety.domain.Report;
import server.safety.domain.ReportReason;
import server.safety.domain.ReportTargetType;
import server.safety.repository.BlockRepository;
import server.safety.repository.ReportRepository;
import server.user.repository.UserRepository;
import server.visit.service.VisitQuery;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

/** 티켓 8: 신고·차단 */
@Service
@RequiredArgsConstructor
public class SafetyService {

    private final MatchAccess matchAccess;
    private final ReportRepository reportRepository;
    private final BlockRepository blockRepository;
    private final VisitQuery visitQuery;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    /**
     * REPORT-01 신고. 매칭 상태와 상관없이 가능 (끝난 매칭도).
     * 신고 대상자는 앱이 보낸 id 를 믿지 않고 서버가 "매칭 상대"로 정한다 → 본인 신고·제3자 신고 불가.
     * 대상 글(targetId)이 정말 이 매칭에서 상대가 쓴 것인지도 확인한다.
     */
    @Transactional
    public Long report(AuthUser me, ReportRequest req) {
        Match m = matchAccess.member(req.matchId(), me);
        UUID partnerId = m.partnerOf(me.id());
        if (req.reason() == ReportReason.OTHER && (req.detail() == null || req.detail().isBlank())) {
            throw new ApiException(ErrorCode.DETAIL_REQUIRED);
        }
        if (req.targetType() != ReportTargetType.PROFILE && req.targetId() == null) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        Long targetId = req.targetType() == ReportTargetType.PROFILE ? m.getId() : req.targetId();
        if (!isPartnersContent(m, partnerId, req.targetType(), targetId)) {
            throw new ApiException(ErrorCode.INVALID_TARGET);
        }
        if (reportRepository.existsByReporterIdAndMatchIdAndTargetUserId(me.id(), m.getId(), partnerId)) {
            throw new ApiException(ErrorCode.ALREADY_REPORTED);
        }
        try {
            return reportRepository.saveAndFlush(Report.of(me.id(), partnerId, m.getId(), req.targetType(),
                    targetId, req.reason(), req.detail(), LocalDateTime.now(clock))).getId();
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(ErrorCode.ALREADY_REPORTED);
        }
    }

    private boolean isPartnersContent(Match m, UUID partnerId, ReportTargetType type, Long targetId) {
        return switch (type) {
            // 명세는 PROFILE 의 targetId = 상대 userId 인데, 사용자 id 가 uuid 로 바뀌어 bigint 칼럼에 못 넣는다.
            // 대상자는 어차피 서버가 매칭 상대로 정하므로 PROFILE 은 targetId 를 보지 않고 matchId 를 저장한다.
            case PROFILE -> true;
            // 방문 기록은 여행자만 쓴다 → 상대가 여행자일 때만 신고 가능
            case VISIT -> visitQuery.authorOf(targetId).map(partnerId::equals).orElse(false)
                    && visitQuery.matchIdOfVisit(targetId).map(m.getId()::equals).orElse(false);
            // 댓글은 메이트가 쓴다
            case COMMENT -> visitQuery.reactionAuthorOf(targetId).map(partnerId::equals).orElse(false)
                    && visitQuery.matchIdOfReaction(targetId).map(m.getId()::equals).orElse(false);
            case CHAT -> messageRepository.findById(targetId)
                    .map(c -> c.getMatchId().equals(m.getId()) && c.getSenderId().equals(partnerId)).orElse(false);
        };
    }

    /**
     * BLOCK-01 차단 (채팅이 열린 뒤에만, 그 전에는 신고 — F-22).
     * 매칭 BLOCKED, 여행자 칸 반환(진행 중 매칭 수에서 빠짐), 이후 서로 추천 제외.
     * 차단당한 쪽에는 알림을 보내지 않는다.
     */
    @Transactional
    public BlockResponse block(AuthUser me, Long matchId) {
        Match m = matchAccess.memberForUpdate(matchId, me);
        UUID partnerId = m.partnerOf(me.id());
        if (blockRepository.existsByBlockerIdAndBlockedId(me.id(), partnerId)) throw new ApiException(ErrorCode.ALREADY_BLOCKED);
        LocalDateTime now = LocalDateTime.now(clock);
        m.block(now);
        blockRepository.save(Block.of(me.id(), partnerId, m.getId(), now));
        return new BlockResponse(m.getId(), m.getStatus().name());
    }

    /** BLOCK-02 내 차단 목록 */
    @Transactional(readOnly = true)
    public List<BlockedUser> myBlocks(AuthUser me) {
        LocalDate today = LocalDate.now(clock);
        return blockRepository.findByBlockerIdOrderByCreatedAtDesc(me.id()).stream()
                .map(b -> userRepository.findById(b.getBlockedId())
                        .map(u -> new BlockedUser(UserSummary.of(u, today), Times.kst(b.getCreatedAt()))).orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    public record ReportRequest(@NotNull Long matchId, @NotNull ReportTargetType targetType, Long targetId,
                                @NotNull ReportReason reason, @Size(max = 1000) String detail) {}

    public record BlockResponse(Long matchId, String status) {}

    public record BlockedUser(UserSummary user, OffsetDateTime blockedAt) {}
}
