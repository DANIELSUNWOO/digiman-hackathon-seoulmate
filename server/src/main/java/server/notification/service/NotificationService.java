package server.notification.service;

import java.util.UUID;

import server.global.common.Times;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.notification.domain.Notification;
import server.notification.domain.NotificationType;
import server.notification.repository.NotificationRepository;
import server.user.domain.User;
import server.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService implements NotificationPublisher {

    private static final int MAX_PAGE = 50;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Override
    @Transactional
    public void publish(UUID receiverId, NotificationType type, Long matchId, Object... args) {
        User receiver = userRepository.findById(receiverId).orElse(null);
        if (receiver == null || !receiver.isActive()) return;           // 탈퇴한 사람에게는 보내지 않는다
        String message = type.format(receiver.getLanguage(), args);     // 받는 사람 언어로 (번역 API 아님)
        notificationRepository.save(Notification.of(receiverId, type, matchId, message, LocalDateTime.now(clock)));
    }

    // ---------- NOTI-01 ~ 04 ----------
    @Transactional(readOnly = true)
    public Page list(UUID userId, Long cursor, int size) {
        int pageSize = Math.min(Math.max(size, 1), MAX_PAGE);
        PageRequest page = PageRequest.of(0, pageSize + 1);            // 1개 더 읽어서 다음 페이지 유무 판단
        List<Notification> rows = cursor == null
                ? notificationRepository.findByUserIdOrderByIdDesc(userId, page)
                : notificationRepository.findByUserIdAndIdLessThanOrderByIdDesc(userId, cursor, page);
        boolean hasNext = rows.size() > pageSize;
        List<Item> items = rows.stream().limit(pageSize).map(Item::of).toList();
        Long nextCursor = hasNext ? items.get(items.size() - 1).notificationId() : null;
        return new Page(items, nextCursor);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(UUID userId, Long notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .filter(x -> x.getUserId().equals(userId))              // 남의 알림은 없는 것처럼
                .orElseThrow(() -> new ApiException(ErrorCode.NOTIFICATION_NOT_FOUND));
        n.markRead();
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notificationRepository.markAllRead(userId);
    }

    public record Item(Long notificationId, String type, Long matchId, String message, boolean isRead,
                       OffsetDateTime createdAt) {
        static Item of(Notification n) {
            return new Item(n.getId(), n.getType().name(), n.getRefId(), n.getMessage(), n.isRead(),
                    Times.kst(n.getCreatedAt()));
        }
    }

    public record Page(List<Item> items, Long nextCursor) {}
}
