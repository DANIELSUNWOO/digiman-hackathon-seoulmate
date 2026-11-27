package server.match.service;

import server.match.domain.Match;
import server.match.repository.MatchRepository;
import server.notification.domain.NotificationType;
import server.notification.service.NotificationPublisher;
import server.visit.service.VisitQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * [서버 B → 서버 A 호출용] 방문 인증(VISIT-01)을 저장한 직후 같은 트랜잭션에서 호출한다.
 *
 *   SpotVisit saved = spotVisitRepository.saveAndFlush(...);
 *   boolean chatReady = matchProgressService.onVisitVerified(matchId);
 *   // 응답의 chatReady 에 그대로 넣는다
 *
 * API v1.7: 인증 수가 required_visits(코스 스팟 50% 내림)에 처음 도달한 순간 chat_status = READY 로 바꾸고
 * 여행자에게만 CHAT_READY 알림 (여행자가 CHAT-01 로 바로 연다. 메이트 수락 없음).
 * 반환값 true = 이번 인증으로 READY 가 됨 (VISIT-01 응답에 그대로 쓰면 된다).
 */
@Service
@RequiredArgsConstructor
public class MatchProgressService {

    private final MatchRepository matchRepository;
    private final VisitQuery visitQuery;
    private final NotificationPublisher notificationPublisher;

    @Transactional(propagation = Propagation.MANDATORY)   // 반드시 서버 B의 방문 인증 트랜잭션 안에서
    public boolean onVisitVerified(Long matchId) {
        Match m = matchRepository.findByIdForUpdate(matchId).orElseThrow();
        long visited = visitQuery.countByMatch(matchId);
        if (!m.markChatReadyIfReached(visited)) return false;
        notificationPublisher.publish(m.getTravelerId(), NotificationType.CHAT_READY, matchId);
        return true;
    }
}
