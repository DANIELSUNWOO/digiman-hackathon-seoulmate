package server.notification.service;

import java.util.UUID;

import server.notification.domain.NotificationType;

/**
 * [공용 인터페이스] 알림 발행. 서버 A·B 어디서든 주입받아 호출한다.
 * 호출한 쪽 트랜잭션 안에서 저장되므로, 본 작업이 롤백되면 알림도 함께 롤백된다.
 *
 * 예) 서버 B 방문 인증: notificationPublisher.publish(mateId, NotificationType.VISIT, matchId, travelerNickname, spotName);
 *
 * @param args 문장 틀의 {0}, {1} … 에 들어갈 값 (보통 {0} = 상대 닉네임)
 */
public interface NotificationPublisher {
    void publish(UUID receiverId, NotificationType type, Long matchId, Object... args);
}
