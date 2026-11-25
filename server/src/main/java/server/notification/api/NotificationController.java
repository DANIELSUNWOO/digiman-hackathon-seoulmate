package server.notification.api;

import server.global.security.AuthUser;
import server.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "알림")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "NOTI-01 알림 목록 (최신 순, cursor 페이지)")
    @GetMapping
    public NotificationService.Page list(AuthUser me,
                                         @RequestParam(required = false) Long cursor,
                                         @RequestParam(defaultValue = "20") int size) {
        return notificationService.list(me.id(), cursor, size);
    }

    @Operation(summary = "NOTI-02 안 읽은 알림 수")
    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(AuthUser me) {
        return Map.of("count", notificationService.unreadCount(me.id()));
    }

    @Operation(summary = "NOTI-03 알림 읽음")
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Void> read(AuthUser me, @PathVariable Long notificationId) {
        notificationService.markRead(me.id(), notificationId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "NOTI-04 전체 읽음")
    @PatchMapping("/read-all")
    public ResponseEntity<Void> readAll(AuthUser me) {
        notificationService.markAllRead(me.id());
        return ResponseEntity.noContent().build();
    }
}
