package server.visit.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.match.domain.Match;
import server.match.repository.MatchRepository;
import server.visit.domain.SpotVisit;
import server.visit.domain.VisitReaction;
import server.visit.repository.SpotVisitRepository;
import server.visit.repository.VisitReactionRepository;

import java.util.Optional;
import java.util.UUID;

/** [B 소유] 임시로 A가 작성한 동작하는 구현. 선우님이 자유롭게 수정 */
@Service
@RequiredArgsConstructor
public class VisitQueryImpl implements VisitQuery {

    private final SpotVisitRepository visitRepository;
    private final VisitReactionRepository reactionRepository;
    private final MatchRepository matchRepository;

    @Override
    @Transactional(readOnly = true)
    public long countByMatch(Long matchId) {
        return visitRepository.countByMatchId(matchId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> authorOf(Long visitId) {
        return visitRepository.findById(visitId)
                .flatMap(v -> matchRepository.findById(v.getMatchId()))
                .map(Match::getTravelerId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> reactionAuthorOf(Long reactionId) {
        return reactionRepository.findById(reactionId).map(VisitReaction::getAuthorId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Long> matchIdOfVisit(Long visitId) {
        return visitRepository.findById(visitId).map(SpotVisit::getMatchId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Long> matchIdOfReaction(Long reactionId) {
        return reactionRepository.findById(reactionId)
                .flatMap(r -> visitRepository.findById(r.getVisitId()))
                .map(SpotVisit::getMatchId);
    }
}
