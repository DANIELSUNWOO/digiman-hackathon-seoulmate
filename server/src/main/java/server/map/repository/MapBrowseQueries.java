package server.map.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import server.map.domain.SecretMap;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.tag.domain.UserTag;
import server.user.domain.Role;
import server.user.domain.User;
import server.user.domain.UserStatus;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * [B 소유] 지도 고르기(MAP-07·08)와 지도 선택 확인(MapSelectability) 전용 읽기 쿼리.
 * 다른 영역의 테이블을 읽기만 하므로 A 의 Repository 를 고치지 않고 여기에 모아 둔다.
 */
public interface MapBrowseQueries extends Repository<SecretMap, Long> {

    @Query("select u from User u where u.role = :role and u.status = :status")
    List<User> findUsers(@Param("role") Role role, @Param("status") UserStatus status);

    @Query("select ut from UserTag ut where ut.userId in :userIds")
    List<UserTag> findTagsOf(@Param("userIds") Collection<UUID> userIds);

    @Query("select sm from SecretMap sm where sm.mateId in :mateIds")
    List<SecretMap> findMapsOf(@Param("mateIds") Collection<UUID> mateIds);

    /** 지도별 스팟 수·공개 스팟 수. 결과: [mapId, spotCount, previewCount] */
    @Query("select s.mapId, count(s), sum(case when s.preview = true then 1 else 0 end) " +
            "from Spot s where s.mapId in :mapIds group by s.mapId")
    List<Object[]> countSpotsByMap(@Param("mapIds") Collection<Long> mapIds);

    /** 지도별 코스로 선택된 누적 횟수 (인기순, 카드의 "♥ n人が選択"). 결과: [mapId, count] */
    @Query("select m.courseMapId, count(m) from Match m where m.courseMapId in :mapIds group by m.courseMapId")
    List<Object[]> countSelectedByMap(@Param("mapIds") Collection<Long> mapIds);

    /** 메이트별 진행 중 매칭 수 (정원 10건). 결과: [mateId, count] */
    @Query("select m.mateId, count(m) from Match m where m.mateId in :mateIds and m.status in :statuses group by m.mateId")
    List<Object[]> countActiveByMate(@Param("mateIds") Collection<UUID> mateIds,
                                     @Param("statuses") Collection<MatchStatus> statuses);

    /** 여행자의 진행 중 매칭 (내가 이미 고른 지도 표시용) */
    @Query("select m from Match m where m.travelerId = :travelerId and m.status in :statuses")
    List<Match> findTravelerMatches(@Param("travelerId") UUID travelerId,
                                    @Param("statuses") Collection<MatchStatus> statuses);
}
