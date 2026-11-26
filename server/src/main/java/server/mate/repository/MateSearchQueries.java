package server.mate.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import server.map.domain.SecretMap;
import server.tag.domain.UserTag;
import server.user.domain.Role;
import server.user.domain.User;
import server.user.domain.UserStatus;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * [B 소유] 메이트 찾기(MATE-01) 전용 읽기 쿼리.
 * 다른 영역의 테이블을 읽기만 하므로 A 의 Repository 를 고치지 않고 여기에 모아 둔다.
 */
public interface MateSearchQueries extends Repository<User, java.util.UUID> {

    @Query("select u from User u where u.role = :role and u.status = :status")
    List<User> findByRoleAndStatus(@Param("role") Role role, @Param("status") UserStatus status);

    @Query("select ut from UserTag ut where ut.userId in :userIds")
    List<UserTag> findTagsOf(@Param("userIds") Collection<UUID> userIds);

    @Query("select sm from SecretMap sm where sm.mateId in :mateIds")
    List<SecretMap> findMapsOf(@Param("mateIds") Collection<UUID> mateIds);

    /** 메이트별로 자기 지도가 코스로 선택된 누적 횟수 (인기순). 결과: [mateId, count] */
    @Query("select sm.mateId, count(m) from Match m, SecretMap sm " +
            "where m.courseMapId = sm.id and sm.mateId in :mateIds group by sm.mateId")
    List<Object[]> countSelectedByMate(@Param("mateIds") Collection<UUID> mateIds);
}
