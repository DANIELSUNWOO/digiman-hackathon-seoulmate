package server.match.service;

import server.match.domain.ChatStatus;
import server.match.domain.MatchStatus;
import server.user.domain.Role;

import java.util.UUID;

/** MatchAccess.requireMember 결과. myRole = 이 매칭에서 내 역할 */
public record MatchMembership(Long matchId, MatchStatus status, ChatStatus chatStatus, Long courseMapId,
                              Integer requiredVisits, Role myRole, UUID partnerId) {
    public boolean iAmTraveler() { return myRole == Role.TRAVELER; }
    public boolean iAmMate() { return myRole == Role.MATE; }
}
