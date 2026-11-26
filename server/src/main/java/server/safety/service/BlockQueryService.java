package server.safety.service;

import java.util.UUID;

import server.safety.repository.BlockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

/** [서버 B 호출용] 오늘의 추천 후보에서 차단 관계 제외 */
@Service
@RequiredArgsConstructor
public class BlockQueryService {

    private final BlockRepository blockRepository;

    /** 내가 차단했거나 나를 차단한 사람 id 전체 */
    @Transactional(readOnly = true)
    public Set<UUID> blockedRelations(UUID userId) {
        return new HashSet<>(blockRepository.findBlockedRelations(userId));
    }

    @Transactional(readOnly = true)
    public boolean isBlockedBetween(UUID a, UUID b) {
        return blockRepository.existsBetween(a, b);
    }
}
