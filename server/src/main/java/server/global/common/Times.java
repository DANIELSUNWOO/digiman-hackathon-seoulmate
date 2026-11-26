package server.global.common;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/** DB 에는 서울 시각(LocalDateTime)으로 저장하고, 응답에는 +09:00 을 붙여 ISO 8601 로 내려준다. */
public final class Times {
    private static final ZoneOffset KST = ZoneOffset.ofHours(9);
    private Times() {}

    public static OffsetDateTime kst(LocalDateTime t) {
        return t == null ? null : t.atOffset(KST);
    }
}
