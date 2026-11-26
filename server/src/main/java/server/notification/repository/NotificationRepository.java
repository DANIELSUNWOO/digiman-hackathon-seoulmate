package server.notification.repository;

import java.util.UUID;

import server.notification.domain.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByIdDesc(UUID userId, Pageable pageable);

    List<Notification> findByUserIdAndIdLessThanOrderByIdDesc(UUID userId, Long cursor, Pageable pageable);

    long countByUserIdAndReadFalse(UUID userId);

    @Modifying(clearAutomatically = true)
    @Query("update Notification n set n.read = true where n.userId = :userId and n.read = false")
    int markAllRead(@Param("userId") UUID userId);
}
