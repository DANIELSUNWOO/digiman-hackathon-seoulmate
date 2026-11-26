package server.global.security;

import server.user.domain.Role;

import java.util.UUID;

/**
 * 등록된(AUTH-01 완료) 활동 중 회원. 컨트롤러 파라미터에 AuthUser me 를 쓰면 자동으로 채워진다.
 * 아직 등록 전이면 404 USER_NOT_REGISTERED, 탈퇴했으면 403 WITHDRAWN_USER 가 먼저 나간다.
 */
public record AuthUser(UUID id, Role role, String email) {
    public boolean isTraveler() { return role == Role.TRAVELER; }
    public boolean isMate() { return role == Role.MATE; }
}
