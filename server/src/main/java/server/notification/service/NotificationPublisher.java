package server.notification.service;

import server.notification.domain.NotificationType;

import java.util.UUID;

/**
 * [A 소유 · B가 사용] 알림 발행. 호출한 쪽 트랜잭션 안에서 저장된다 (본 작업이 롤백되면 알림도 롤백).
 * 문장의 {0}(상대 닉네임)은 matchId 로 서버가 알아서 채운다. 추가 값은 extra 로 넘기면 {1}, {2} … 에 들어간다.
 *
 * 예) 방문 인증(B): notificationPublisher.publish(mateId, NotificationType.VISIT, matchId, spotName);
 *     리액션(B):   notificationPublisher.publish(travelerId, NotificationType.REACTION, matchId);
 */
public interface NotificationPublisher {
    void publish(UUID userId, NotificationType type, Long matchId, Object... extra);
}
