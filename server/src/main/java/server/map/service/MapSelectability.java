package server.map.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.map.domain.SecretMap;
import server.map.repository.SecretMapRepository;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.service.MateEligibility;
import server.map.repository.MapBrowseQueries;
import server.safety.repository.BlockRepository;
import server.user.domain.MatchPreference;
import server.user.domain.User;
import server.user.repository.UserRepository;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * [B 소유 · A가 사용] "이 여행자가 이 지도를 고를 수 있는가" (API v1.7 MAP-07 목록 조건 = MATCH-01 재검증).
 * 지도 고르기 목록(MAP-07)·미리보기(MAP-08)와 서버 A 의 지도 선택(MATCH-01)이 같은 기준을 쓰도록 한곳에 둔다.
 *
 * 메이트 조건: 활동 중 + 성별·연령대 칩 통과(MateEligibility.passesProfileRules) + 차단 관계 없음 + 진행 중 매칭 10건 미만.
 * 지도 조건: 공개 조건(스팟 5곳 이상 + 공개 스팟 2곳). 같은 메이트의 다른 지도는 따로 고를 수 있다.
 */
@Component
@RequiredArgsConstructor
public class MapSelectability {

    private final SecretMapRepository mapRepository;
    private final UserRepository userRepository;
    private final BlockRepository blockRepository;
    private final MapBrowseQueries queries;
    private final MapVisibility mapVisibility;
    private final MateEligibility eligibility;
    private final PolicyProperties policy;

    /**
     * [서버 A MATCH-01 용] 고를 수 없으면 명세서의 에러 코드로 던지고, 고를 수 있으면 지도를 돌려준다.
     * 칸(NO_FREE_SLOT)·여행 일정(TRIP_REQUIRED) 확인과, 정원을 넘지 않도록 하는 잠금은 호출하는 쪽(MATCH-01)에서 한다.
     *
     * @throws ApiException MAP_NOT_FOUND / MAP_ALREADY_SELECTED / MAP_NOT_AVAILABLE / MATE_FULL
     */
    public SecretMap requireSelectable(User traveler, MatchPreference pref, Long mapId) {
        SecretMap map = mapRepository.findById(mapId).orElseThrow(() -> new ApiException(ErrorCode.MAP_NOT_FOUND));
        if (activeMatchOn(traveler.getId(), mapId).isPresent()) throw new ApiException(ErrorCode.MAP_ALREADY_SELECTED);
        if (!mapVisibility.isPublic(mapId)) throw new ApiException(ErrorCode.MAP_NOT_AVAILABLE);

        User mate = userRepository.findById(map.getMateId()).orElse(null);
        if (mate == null || !eligibility.passesProfileRules(traveler, pref, mate)
                || blockRepository.existsBetween(traveler.getId(), mate.getId())) {
            throw new ApiException(ErrorCode.MAP_NOT_AVAILABLE);
        }
        if (eligibility.activeMatchesOf(mate.getId()) >= policy.mateMaxActiveMatches()) {
            throw new ApiException(ErrorCode.MATE_FULL);
        }
        return map;
    }

    /** 이 여행자가 이 지도로 진행 중인 매칭 (이미 고른 지도면 present) */
    public Optional<Match> activeMatchOn(UUID travelerId, Long mapId) {
        return queries.findTravelerMatches(travelerId, MatchStatus.ACTIVE).stream()
                .filter(m -> mapId.equals(m.getCourseMapId()))
                .findFirst();
    }

    /** 메이트가 목록 조건을 통과하는지 (목록용: 차단 상대·진행 중 매칭 수를 미리 모아 넘긴다) */
    public boolean mateListable(User traveler, MatchPreference pref, User mate, Set<UUID> blockedIds, long activeMatches) {
        return eligibility.passesProfileRules(traveler, pref, mate)
                && !blockedIds.contains(mate.getId())
                && activeMatches < policy.mateMaxActiveMatches();
    }

    /** 메이트 한 명 확인 (미리보기용) */
    public boolean mateListable(User traveler, MatchPreference pref, User mate) {
        return mate != null
                && eligibility.passesProfileRules(traveler, pref, mate)
                && !blockRepository.existsBetween(traveler.getId(), mate.getId())
                && eligibility.activeMatchesOf(mate.getId()) < policy.mateMaxActiveMatches();
    }
}
