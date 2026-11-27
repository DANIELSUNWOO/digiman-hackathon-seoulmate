package server.match.domain;

import java.util.EnumSet;
import java.util.Set;

/**
 * 매칭 상태머신 (API v1.7: 지도를 고르는 순간 매칭 + 코스 확정 → 처음부터 ON_COURSE)
 *
 *   ON_COURSE ──여행 완료/자동 완료──▶ COMPLETED ──차단──▶ BLOCKED
 *       ├──매칭 끊기(여행자·메이트)──▶ CANCELED
 *       ├──기간 만료 배치────────────▶ EXPIRED
 *       └──차단──────────────────────▶ BLOCKED
 *
 * MATCHED 는 v1.6 까지의 상태라 남겨만 둔다 (새로 만들지 않음).
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
