package server.match.service;

import java.util.UUID;

import server.global.event.MatchCompletedEvent;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.notification.domain.NotificationType;
import server.notification.service.NotificationPublisher;
import server.user.repository.UserRepository;
import server.visit.repository.SpotVisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 티켓 7: 자동 종료·자동 완료 (매일 00:10 서울)
 *  - 여행 종료일이 지난 진행 중 매칭 중
 *    · 코스를 골랐고 인증 수 ≥ required_visits(코스 스팟 50%) → COMPLETED + 앨범 이벤트 (API v1.3 자동 완료)
 *    · 그 외 (코스 미선택 또는 인증 부족)                         → EXPIRED (F-24)
 *  - 매칭 1건씩 따로 트랜잭션: 한 건이 실패해도 나머지는 처리된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MatchLifecycleJob {

    private final MatchRepository matchRepository;
    private final SpotVisitRepository visitRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notificationPublisher;
    private final ApplicationEventPublisher eventPublisher;
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
        String travelerName = nickname(m.getTravelerId());
        String mateName = nickname(m.getMateId());

        boolean reached = m.getStatus() == MatchStatus.ON_COURSE && m.getRequiredVisits() != null
                && visitRepository.countByMatchId(m.getId()) >= m.getRequiredVisits();
        if (reached) {
            m.complete(now);
            eventPublisher.publishEvent(new MatchCompletedEvent(m.getId(), null, null, true));
            notificationPublisher.publish(m.getTravelerId(), NotificationType.COMPLETED, m.getId(), mateName);
            notificationPublisher.publish(m.getMateId(), NotificationType.COMPLETED, m.getId(), travelerName);
            return Outcome.COMPLETED;
        }
        m.expire(now);
        notificationPublisher.publish(m.getTravelerId(), NotificationType.EXPIRED, m.getId(), mateName);
        notificationPublisher.publish(m.getMateId(), NotificationType.EXPIRED, m.getId(), travelerName);
        return Outcome.EXPIRED;
    }

    private String nickname(UUID userId) {
        return userRepository.findById(userId).map(u -> u.getNickname()).orElse("-");
    }

    private enum Outcome { EXPIRED, COMPLETED, SKIPPED }

    public record Result(int expired, int completed, int failed) {}
}
