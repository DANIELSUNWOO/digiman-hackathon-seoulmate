package server.global.security;

import java.util.UUID;

/** 토큰만 확인된 사용자 (회원 등록 전에도 쓰는 AUTH-01, USER-01 용). id = Supabase sub */
public record TokenUser(UUID id, String email) {}
