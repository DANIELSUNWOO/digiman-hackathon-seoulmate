package server.global.event;

/**
 * [서버 A → 서버 B] 매칭이 COMPLETED 가 되는 순간 같은 트랜잭션 안에서 발행한다.
 * 서버 B의 앨범 담당이 @EventListener(동기)로 받아 ALBUMS 1행을 만든다.
 * albumTitle·coverUrl 이 null 이면 제목 = 코스 지도 이름, 표지 = 첫 인증 사진 (MATCH-08).
 * auto = true 면 자동 완료 배치에서 발생한 것.
 */
public record MatchCompletedEvent(Long matchId, String albumTitle, String coverUrl, boolean auto) {}
