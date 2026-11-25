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

    @Column(name = "traveler_chat_ok")
    private Boolean travelerChatOk;

    @Column(name = "mate_chat_ok")
    private Boolean mateChatOk;

    @Column(name = "matched_at", nullable = false)
    private LocalDateTime matchedAt;

    @Column(name = "course_selected_at")
    private LocalDateTime courseSelectedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    public static Match create(Long tripId, UUID travelerId, UUID mateId, LocalDateTime now) {
        Match m = new Match();
        m.tripId = tripId;
        m.travelerId = travelerId;
        m.mateId = mateId;
        m.status = MatchStatus.MATCHED;
        m.chatStatus = ChatStatus.LOCKED;
        m.matchedAt = now;
        return m;
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
    /** MATCH-05 코스 선택. required_visits 를 이때 확정한다. */
    public void selectCourse(Long mapId, int requiredVisits, LocalDateTime now) {
        if (!status.isActive()) throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        if (status == MatchStatus.ON_COURSE) throw new ApiException(ErrorCode.COURSE_ALREADY_SELECTED);
        this.courseMapId = mapId;
        this.requiredVisits = requiredVisits;
        this.courseSelectedAt = now;
        moveTo(MatchStatus.ON_COURSE, now, false);
    }

    /** MATCH-07 여행자 취소 */
    public void cancel(LocalDateTime now) {
        if (!status.isActive()) throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        moveTo(MatchStatus.CANCELED, now, true);
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

    /** BLOCK-01 차단. 채팅이 열린 뒤에만 (그 전에는 신고, F-22) */
    public void block(LocalDateTime now) {
        if (chatStatus != ChatStatus.OPEN) throw new ApiException(ErrorCode.CHAT_NOT_OPEN);
        if (!status.canMoveTo(MatchStatus.BLOCKED)) throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        moveTo(MatchStatus.BLOCKED, now, true);
    }

    private void moveTo(MatchStatus next, LocalDateTime now, boolean ends) {
        if (!status.canMoveTo(next)) throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        this.status = next;
        if (ends) this.endedAt = now;
    }

    // ---------- 채팅 ----------
    /** 방문 인증 수가 필요 수에 도달하면 REQUESTED 로. 처음 도달한 순간에만 true */
    public boolean requestChatIfReached(long visitedCount) {
        if (chatStatus != ChatStatus.LOCKED || requiredVisits == null) return false;
        if (visitedCount < requiredVisits) return false;
        this.chatStatus = ChatStatus.REQUESTED;
        return true;
    }

    /** CHAT-01. 양쪽 모두 true 가 되는 순간 OPEN. 열렸으면 true 반환 */
    public boolean answerChat(UUID userId, boolean accept) {
        if (status == MatchStatus.CANCELED || status == MatchStatus.BLOCKED || status == MatchStatus.EXPIRED) {
            throw new ApiException(ErrorCode.MATCH_NOT_ACTIVE);
        }
        if (chatStatus == ChatStatus.LOCKED) throw new ApiException(ErrorCode.CHAT_NOT_REQUESTED);
        if (chatStatus == ChatStatus.OPEN) throw new ApiException(ErrorCode.CHAT_ALREADY_OPEN);
        if (travelerId.equals(userId)) travelerChatOk = accept;
        else if (mateId.equals(userId)) mateChatOk = accept;
        else throw new ApiException(ErrorCode.NOT_MATCH_MEMBER);

        if (Boolean.TRUE.equals(travelerChatOk) && Boolean.TRUE.equals(mateChatOk)) {
            this.chatStatus = ChatStatus.OPEN;
            return true;
        }
        return false;
    }

    public Boolean chatAnswerOf(UUID userId) {
        return travelerId.equals(userId) ? travelerChatOk : mateChatOk;
    }

    /** 쪽지를 주고받을 수 있는 상태인지 (완료 후에도 가능, 차단·취소·만료면 불가) */
    public boolean canMessage() {
        return chatStatus == ChatStatus.OPEN
                && (status == MatchStatus.ON_COURSE || status == MatchStatus.COMPLETED);
    }
}
