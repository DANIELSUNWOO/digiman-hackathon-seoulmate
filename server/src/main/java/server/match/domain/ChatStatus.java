package server.match.domain;

/**
 * API v1.7: LOCKED(필요 인증 수 미만) → READY(필요 인증 수 달성, 여행자가 열 수 있음) → OPEN(여행자가 엶).
 * 메이트 수락 단계는 없다.
 */
public enum ChatStatus { LOCKED, READY, OPEN }
