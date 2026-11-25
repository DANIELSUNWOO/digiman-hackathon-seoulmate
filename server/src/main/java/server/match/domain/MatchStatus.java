package server.match.domain;

import java.util.EnumSet;
import java.util.Set;

/**
 * 매칭 상태머신
 *
 *   MATCHED ──코스 선택──▶ ON_COURSE ──여행 완료/자동 완료──▶ COMPLETED
 *     │                      │
 *     ├──여행자 취소──────────┼──▶ CANCELED
 *     ├──기간 만료 배치───────┼──▶ EXPIRED
 *     └──차단(채팅 OPEN 후)───┴──▶ BLOCKED   (COMPLETED 후 차단도 허용: 완료 후에도 채팅 가능하므로)
 */
public enum MatchStatus {
    MATCHED, ON_COURSE, COMPLETED, CANCELED, EXPIRED, BLOCKED;

    public static final Set<MatchStatus> ACTIVE = EnumSet.of(MATCHED, ON_COURSE);
    public static final Set<MatchStatus> ENDED = EnumSet.of(COMPLETED, CANCELED, EXPIRED, BLOCKED);

    public boolean isActive() { return ACTIVE.contains(this); }

    public boolean canMoveTo(MatchStatus next) {
        return switch (this) {
            case MATCHED -> next == ON_COURSE || next == CANCELED || next == EXPIRED || next == BLOCKED;
            case ON_COURSE -> next == COMPLETED || next == CANCELED || next == EXPIRED || next == BLOCKED;
            case COMPLETED -> next == BLOCKED;
            case CANCELED, EXPIRED, BLOCKED -> false;
        };
    }
}
