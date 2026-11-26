package server.match.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.map.service.MapQuery;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.safety.repository.BlockRepository;
import server.user.domain.MatchPreference;
import server.user.domain.User;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

/**
 * [공용] "이 메이트가 이 여행자의 메이트 찾기 목록에 나올 수 있는가" (API v1.4 MATE-01 목록 조건).
 * 서버 B의 MATE-01 목록 필터와 서버 A의 MATCH-01 재검증이 같은 기준을 쓰도록 한곳에 둔다.
 */
@Component
@RequiredArgsConstructor
public class MateEligibility {

    private final MatchRepository matchRepository;
    private final BlockRepository blockRepository;
    private final MapQuery mapQuery;
    private final PolicyProperties policy;
    private final Clock clock;

    /** MATCH-01 용: 통과하지 못하면 명세서의 에러 코드로 던진다 */
    public void check(User traveler, MatchPreference pref, User mate) {
        if (!passesProfileRules(traveler, pref, mate)) throw new ApiException(ErrorCode.MATE_NOT_AVAILABLE);
        if (!hasPublicMap(mate.getId())) throw new ApiException(ErrorCode.MATE_NOT_AVAILABLE);
        if (blockRepository.existsBetween(traveler.getId(), mate.getId())) throw new ApiException(ErrorCode.MATE_NOT_AVAILABLE);
        if (matchRepository.existsByTravelerIdAndMateIdAndStatusIn(traveler.getId(), mate.getId(), MatchStatus.ACTIVE)) {
            throw new ApiException(ErrorCode.ALREADY_MATCHED);
        }
        if (activeMatchesOf(mate.getId()) >= policy.mateMaxActiveMatches()) throw new ApiException(ErrorCode.MATE_FULL);
    }

    /** MATE-01 목록용 (서버 B): 예외 없이 true/false */
    public boolean isListable(User traveler, MatchPreference pref, User mate) {
        try {
            check(traveler, pref, mate);
            return true;
        } catch (ApiException e) {
            return false;
        }
    }

    /** 활동 중인 메이트 + 성별 조건 + 연령대 칩 (DB 조회 없이 판단 가능한 부분) */
    public boolean passesProfileRules(User traveler, MatchPreference pref, User mate) {
        if (mate == null || !mate.isActive() || !mate.isMate() || !mate.hasProfile()) return false;
        if (!pref.getGenderPref().accepts(traveler.getGender(), mate.getGender())) return false;
        return pref.acceptsAgeChip(mate.ageChip(LocalDate.now(clock)));
    }

    public boolean hasPublicMap(UUID mateId) {
        return !mapQuery.findPublicMaps(mateId).isEmpty();
    }

    public long activeMatchesOf(UUID mateId) {
        return matchRepository.countByMateIdAndStatusIn(mateId, MatchStatus.ACTIVE);
    }
}
