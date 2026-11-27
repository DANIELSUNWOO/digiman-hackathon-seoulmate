package server.match.domain;

import java.util.UUID;

import server.global.error.ApiException;
import server.global.error.ErrorCode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 매칭. 상태 변경은 반드시 이 클래스의 메서드로만 한다 (setter 없음).
 * 잘못된 상태에서 호출하면 명세서의 409 에러 코드로 막힌다.
 */
@Entity
@Table(name = "matches")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Match {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "traveler_id", nullable = false)
    private UUID travelerId;

    @Column(name = "mate_id", nullable = false)
    private UUID mateId;

    @Column(name = "course_map_id")
    private Long courseMapId;

    @Column(name = "required_visits")
    private Integer requiredVisits;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private MatchStatus status;

    @Enumerated(EnumType.STRING) @Column(name = "chat_status", nullable = false, length = 20)
    private ChatStatus chatStatus;

    @Enumerated(EnumType.STRING) @Column(name = "cancel_reason", length = 30)
    private CancelReason cancelReason;

    @Column(name = "cancel_detail", length = 300)
    private String cancelDetail;

    @Column(name = "canceled_by")
    private UUID canceledBy;

    @Column(name = "matched_at", nullable = false)
    private LocalDateTime matchedAt;

    @Column(name = "course_selected_at")
    private LocalDateTime courseSelectedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    /**
     * MATCH-01 (API v1.7) 지도 선택 = 매칭 + 코스 확정. 처음부터 ON_COURSE.
     * required_visits 는 이때 계산해 저장하고, 여행 중에 스팟이 늘어도 바꾸지 않는다.
     */
    public static Match create(Long tripId, UUID travelerId, UUID mateId, Long courseMapId, int requiredVisits,
                               LocalDateTime now) {
        Match m = new Match();
        m.tripId = tripId;
        m.travelerId = travelerId;
        m.mateId = mateId;
        m.courseMapId = courseMapId;
        m.requiredVisits = requiredVisits;
        m.status = MatchStatus.ON_COURSE;
        m.chatStatus = ChatStatus.LOCKED;
        m.matchedAt = now;
        m.courseSelectedAt = now;
        return m;
    }

    public boolean isTraveler(UUID userId) {
        return travelerId.equals(userId);
    }

    // ---------- 당사자 ----------
    public boolean isMember(UUID userId) {
        return travelerId.equals(userId) || mateId.equals(userId);
    }

    public UUID partnerOf(UUID userId) {
        if (travelerId.equals(userId)) return mateId;
        if (mateId.equals(userId)) return travelerId;
        throw new ApiException(ErrorCode.NOT_MATCH_MEMBER);
    }

    // ---------- 상태 전이 ----------
    /** MATCH-07 매칭 끊기 (API v1.7: 여행자·메이트 모두, 사유는 선택) */
    public void cancel(UUID by, CancelReason reason, String detail, LocalDateTime now) {
        if (!isMember(by)) throw new ApiException(ErrorCode.NOT_MATCH_MEMBER);
        if (!status.isActive()) throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        moveTo(MatchStatus.CANCELED, now, true);
        this.canceledBy = by;
        this.cancelReason = reason;
        this.cancelDetail = detail == null || detail.isBlank() ? null : detail.strip();
    }

    /** MATCH-08 여행 완료 / 자동 완료 */
    public void complete(LocalDateTime now) {
        if (status != MatchStatus.ON_COURSE) throw new ApiException(ErrorCode.MATCH_NOT_ON_COURSE);
        moveTo(MatchStatus.COMPLETED, now, true);
    }

    /** 자동 종료 배치 */
    public void expire(LocalDateTime now) {
        if (!status.isActive()) throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        moveTo(MatchStatus.EXPIRED, now, true);
    }

    /**
     * BLOCK-01 차단 (API v1.5: 채팅 여부와 상관없이 언제든).
     * 진행 중(ON_COURSE)이면 BLOCKED 로 바꾸고 true (여행자 칸 반환).
     * 이미 끝난 매칭이면 상태는 그대로 두고 false (차단 관계만 저장).
     */
    public boolean blockIfActive(LocalDateTime now) {
        if (!status.isActive()) return false;
        moveTo(MatchStatus.BLOCKED, now, true);
        return true;
    }

    private void moveTo(MatchStatus next, LocalDateTime now, boolean ends) {
        if (!status.canMoveTo(next)) throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        this.status = next;
        if (ends) this.endedAt = now;
    }

    // ---------- 채팅 (API v1.7) ----------
    /** 방문 인증 수가 필요 수에 처음 도달한 순간 LOCKED → READY. 그 순간에만 true */
    public boolean markChatReadyIfReached(long visitedCount) {
        if (chatStatus != ChatStatus.LOCKED || requiredVisits == null) return false;
        if (!status.isActive()) return false;
        if (visitedCount < requiredVisits) return false;
        this.chatStatus = ChatStatus.READY;
        return true;
    }

    /** CHAT-01 여행자가 채팅 열기. 메이트 수락 단계 없음 */
    public void openChat(UUID userId) {
        if (!isMember(userId)) throw new ApiException(ErrorCode.NOT_MATCH_MEMBER);
        if (!isTraveler(userId)) throw new ApiException(ErrorCode.ROLE_FORBIDDEN);
        if (status != MatchStatus.ON_COURSE && status != MatchStatus.COMPLETED) {
            throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        }
        if (chatStatus == ChatStatus.OPEN) throw new ApiException(ErrorCode.CHAT_ALREADY_OPEN);
        if (chatStatus == ChatStatus.LOCKED) throw new ApiException(ErrorCode.CHAT_NOT_READY);
        this.chatStatus = ChatStatus.OPEN;
    }

    /** MATCH-03 chat.canOpen: 내가 여행자이고 READY */
    public boolean canOpenChat(UUID viewerId) {
        return isTraveler(viewerId) && chatStatus == ChatStatus.READY
                && (status == MatchStatus.ON_COURSE || status == MatchStatus.COMPLETED);
    }

    /** 쪽지를 주고받을 수 있는 상태인지 (완료 후에도 가능, 차단·취소·만료면 불가) */
    public boolean canMessage() {
        return chatStatus == ChatStatus.OPEN
                && (status == MatchStatus.ON_COURSE || status == MatchStatus.COMPLETED);
    }
}
