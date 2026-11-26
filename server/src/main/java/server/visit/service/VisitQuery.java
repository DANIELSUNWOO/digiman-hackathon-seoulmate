package server.visit.service;

import java.util.Optional;
import java.util.UUID;

/** [B 소유 · A가 사용] 방문 조회. 자동 종료·완료 판정, 진행률, 신고 대상 확인에 쓴다 */
public interface VisitQuery {

    long countByMatch(Long matchId);

    /** 방문 기록을 쓴 사람(= 그 매칭의 여행자). 없으면 empty */
    Optional<UUID> authorOf(Long visitId);

    /** 리액션·댓글을 쓴 사람(메이트). 없으면 empty */
    Optional<UUID> reactionAuthorOf(Long reactionId);

    /** 방문 기록이 속한 매칭 id (신고 대상이 정말 이 매칭의 글인지 확인용) */
    Optional<Long> matchIdOfVisit(Long visitId);

    /** 리액션이 달린 방문 기록의 매칭 id */
    Optional<Long> matchIdOfReaction(Long reactionId);
}
