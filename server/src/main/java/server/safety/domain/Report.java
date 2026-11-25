package server.safety.domain;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reporter_id", nullable = false)
    private UUID reporterId;

    /** 신고 대상자는 앱이 보낸 값이 아니라 서버가 매칭 상대로 정한다 */
    @Column(name = "target_user_id", nullable = false)
    private UUID targetUserId;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Enumerated(EnumType.STRING) @Column(name = "target_type", nullable = false, length = 20)
    private ReportTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private ReportReason reason;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ReportStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static Report of(UUID reporterId, UUID targetUserId, Long matchId, ReportTargetType type, Long targetId,
                            ReportReason reason, String detail, LocalDateTime now) {
        Report r = new Report();
        r.reporterId = reporterId;
        r.targetUserId = targetUserId;
        r.matchId = matchId;
        r.targetType = type;
        r.targetId = targetId;
        r.reason = reason;
        r.detail = detail;
        r.status = ReportStatus.PENDING;
        r.createdAt = now;
        return r;
    }
}
