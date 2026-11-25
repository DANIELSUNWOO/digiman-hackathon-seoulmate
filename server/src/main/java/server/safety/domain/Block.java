package server.safety.domain;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "blocks")
@IdClass(Block.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Block {

    @Id @Column(name = "blocker_id")
    private UUID blockerId;

    @Id @Column(name = "blocked_id")
    private UUID blockedId;

    @Column(name = "match_id")
    private Long matchId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static Block of(UUID blockerId, UUID blockedId, Long matchId, LocalDateTime now) {
        Block b = new Block();
        b.blockerId = blockerId;
        b.blockedId = blockedId;
        b.matchId = matchId;
        b.createdAt = now;
        return b;
    }

    @EqualsAndHashCode
    @NoArgsConstructor
    public static class Key implements Serializable {
        private UUID blockerId;
        private UUID blockedId;
    }
}
