package server.global.common;

import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;

/** 역할 검사 한 줄짜리 헬퍼 */
public final class Guards {
    private Guards() {}

    public static void requireTraveler(AuthUser me) {
        if (!me.isTraveler()) throw new ApiException(ErrorCode.ROLE_FORBIDDEN);
    }

    public static void requireMate(AuthUser me) {
        if (!me.isMate()) throw new ApiException(ErrorCode.ROLE_FORBIDDEN);
    }
}
