package server.tag.repository;

import java.util.UUID;

import server.tag.domain.UserTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserTagRepository extends JpaRepository<UserTag, UserTag.Key> {
    List<UserTag> findByUserId(UUID userId);
    long countByUserId(UUID userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from UserTag ut where ut.userId = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
