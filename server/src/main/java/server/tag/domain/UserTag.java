package server.tag.domain;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Entity
@Table(name = "user_tags")
@IdClass(UserTag.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserTag {

    @Id @Column(name = "user_id")
    private UUID userId;

    @Id @Column(name = "tag_id")
    private Long tagId;

    public static UserTag of(UUID userId, Long tagId) {
        UserTag ut = new UserTag();
        ut.userId = userId;
        ut.tagId = tagId;
        return ut;
    }

    @EqualsAndHashCode
    @NoArgsConstructor
    public static class Key implements Serializable {
        private UUID userId;
        private Long tagId;
    }
}
