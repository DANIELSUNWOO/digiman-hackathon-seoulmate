package server.trip.domain;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "trips")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Trip {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "traveler_id", nullable = false)
    private UUID travelerId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static Trip of(UUID travelerId, LocalDate start, LocalDate end, LocalDateTime now) {
        Trip t = new Trip();
        t.travelerId = travelerId;
        t.startDate = start;
        t.endDate = end;
        t.createdAt = now;
        return t;
    }

    public void change(LocalDate start, LocalDate end) {
        this.startDate = start;
        this.endDate = end;
    }

    /** 종료일이 오늘보다 이전이면 끝난 여행 */
    public boolean isEndedBefore(LocalDate today) {
        return endDate.isBefore(today);
    }
}
