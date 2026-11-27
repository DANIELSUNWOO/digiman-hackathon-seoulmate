package server.match.service;

import java.util.UUID;

import server.album.service.AlbumService;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.notification.domain.NotificationType;
import server.notification.service.NotificationPublisher;
import server.visit.service.VisitQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 티켓 7: 자동 종료·자동 완료 (매일 00:10 서울)
 *  - 여행 종료일이 지난 진행 중 매칭 중
 *    · 인증 수 ≥ required_visits(코스 스팟 50% 내림) → COMPLETED + 앨범 생성, 양쪽 COMPLETED 알림 (자동 완료)
 *    · 인증 부족                                      → EXPIRED + 앨범 생성(API v1.7, T-91 → T-31), 양쪽 EXPIRED 알림
 *  - 매칭 1건씩 따로 트랜잭션: 한 건이 실패해도 나머지는 처리된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MatchLifecycleJob {

    private final MatchRepository matchRepository;
    private final VisitQuery visitQuery;
    private final AlbumService albumService;
    private final NotificationPublisher notificationPublisher;
    private final TransactionTemplate tx;
    private final Clock clock;

    @Scheduled(cron = "0 10 0 * * *", zone = "Asia/Seoul")
    public void scheduled() {
        Result r = run();
        log.info("match lifecycle batch: expired={}, completed={}, failed={}", r.expired(), r.completed(), r.failed());
    }

    /** DEV-01 에서도 호출 */
    public Result run() {
        LocalDate today = LocalDate.now(clock);
        int expired = 0, completed = 0, failed = 0;
        for (Match target : matchRepository.findActiveWithTripEndedBefore(MatchStatus.ACTIVE, today)) {
            try {
                Outcome o = tx.execute(status -> processOne(target.getId()));
                if (o == Outcome.EXPIRED) expired++;
                if (o == Outcome.COMPLETED) completed++;
            } catch (RuntimeException e) {
                failed++;
                log.error("lifecycle batch failed for match {}", target.getId(), e);
            }
        }
        return new Result(expired, completed, failed);
    }

    private Outcome processOne(Long matchId) {
        Match m = matchRepository.findByIdForUpdate(matchId).orElseThrow();
        if (!m.getStatus().isActive()) return Outcome.SKIPPED;            // 그 사이 취소·완료됨
        LocalDateTime now = LocalDateTime.now(clock);

        boolean reached = m.getStatus() == MatchStatus.ON_COURSE && m.getRequiredVisits() != null
                && visitQuery.countByMatch(m.getId()) >= m.getRequiredVisits();
        if (reached) {
            m.complete(now);
            albumService.createForMatch(m.getId(), null, null);                       // B 구현
            notificationPublisher.publish(m.getTravelerId(), NotificationType.COMPLETED, m.getId());
            notificationPublisher.publish(m.getMateId(), NotificationType.COMPLETED, m.getId());
            return Outcome.COMPLETED;
        }
        m.expire(now);
        albumService.createForMatch(m.getId(), null, null);                           // v1.7: 기간 만료에도 앨범
        notificationPublisher.publish(m.getTravelerId(), NotificationType.EXPIRED, m.getId());
        notificationPublisher.publish(m.getMateId(), NotificationType.EXPIRED, m.getId());
        return Outcome.EXPIRED;
    }

    private enum Outcome { EXPIRED, COMPLETED, SKIPPED }

    public record Result(int expired, int completed, int failed) {}
}
