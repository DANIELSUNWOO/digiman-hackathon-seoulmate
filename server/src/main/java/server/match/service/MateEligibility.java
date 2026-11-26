package server.match.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.user.domain.MatchPreference;
import server.user.domain.User;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

/**
 * [공용] 메이트 조건의 기본 재료 (성별·연령대 칩, 진행 중 매칭 수).
 * API v1.7 에서는 서버 B 의 MapSelectability 가 이것을 써서 MAP-07 목록과 MATCH-01 재검증을 같은 기준으로 맞춘다.
 */
@Component
@RequiredArgsConstructor
public class MateEligibility {

    private final MatchRepository matchRepository;
    private final Clock clock;

    /** 활동 중인 메이트 + 성별 조건 + 연령대 칩 (DB 조회 없이 판단 가능한 부분) */
    public boolean passesProfileRules(User traveler, MatchPreference pref, User mate) {
        if (mate == null || !mate.isActive() || !mate.isMate() || !mate.hasProfile()) return false;
        if (!pref.getGenderPref().accepts(traveler.getGender(), mate.getGender())) return false;
        return pref.acceptsAgeChip(mate.ageChip(LocalDate.now(clock)));
    }

    public long activeMatchesOf(UUID mateId) {
        return matchRepository.countByMateIdAndStatusIn(mateId, MatchStatus.ACTIVE);
    }
}
