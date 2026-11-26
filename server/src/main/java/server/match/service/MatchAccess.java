package server.match.service;

import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;
import server.match.domain.Match;
import server.match.repository.MatchRepository;
import server.user.domain.Role;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * [공용] "당사자" 권한 검사. 서버 B(방문·리액션·앨범·후기)도 이걸로 매칭을 꺼내면
 * 404 / 403 NOT_MATCH_MEMBER / ROLE_FORBIDDEN 처리가 한 군데로 통일된다.
 */
@Component
@RequiredArgsConstructor
public class MatchAccess {

    private final MatchRepository matchRepository;

    /**
     * [B가 쓰는 형태] 당사자인지 확인하고 매칭 상태·코스·필요 인증 수·내 역할을 돌려준다.
     * 없으면 404 MATCH_NOT_FOUND, 당사자가 아니면 403 NOT_MATCH_MEMBER
     */
    public MatchMembership requireMember(Long matchId, UUID userId) {
        Match m = matchRepository.findById(matchId).orElseThrow(() -> new ApiException(ErrorCode.MATCH_NOT_FOUND));
        if (!m.isMember(userId)) throw new ApiException(ErrorCode.NOT_MATCH_MEMBER);
        Role role = m.getTravelerId().equals(userId) ? Role.TRAVELER : Role.MATE;
        return new MatchMembership(m.getId(), m.getStatus(), m.getChatStatus(), m.getCourseMapId(),
                m.getRequiredVisits(), role, m.partnerOf(userId));
    }

    public Match member(Long matchId, AuthUser me) {
        return check(matchRepository.findById(matchId), me);
    }

    /** 상태를 바꿀 때는 행 잠금으로 꺼낸다 (동시에 취소·완료·인증이 겹치는 것 방지) */
    public Match memberForUpdate(Long matchId, AuthUser me) {
        return check(matchRepository.findByIdForUpdate(matchId), me);
    }

    public Match travelerMember(Long matchId, AuthUser me, boolean forUpdate) {
        Match m = forUpdate ? memberForUpdate(matchId, me) : member(matchId, me);
        if (!m.getTravelerId().equals(me.id())) throw new ApiException(ErrorCode.ROLE_FORBIDDEN);
        return m;
    }

    public Match mateMember(Long matchId, AuthUser me, boolean forUpdate) {
        Match m = forUpdate ? memberForUpdate(matchId, me) : member(matchId, me);
        if (!m.getMateId().equals(me.id())) throw new ApiException(ErrorCode.ROLE_FORBIDDEN);
        return m;
    }

    private Match check(java.util.Optional<Match> found, AuthUser me) {
        Match m = found.orElseThrow(() -> new ApiException(ErrorCode.MATCH_NOT_FOUND));
        if (!m.isMember(me.id())) throw new ApiException(ErrorCode.NOT_MATCH_MEMBER);
        return m;
    }
}
