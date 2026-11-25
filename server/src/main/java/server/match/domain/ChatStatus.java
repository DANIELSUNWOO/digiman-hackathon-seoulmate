package server.match.domain;

/** LOCKED → REQUESTED(필요 인증 수 달성) → OPEN(양쪽 수락) */
public enum ChatStatus { LOCKED, REQUESTED, OPEN }
