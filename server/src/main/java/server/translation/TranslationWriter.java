package server.translation;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import server.chat.repository.ChatMessageRepository;
import server.global.event.TranslationTarget;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.visit.repository.SpotVisitRepository;
import server.visit.repository.VisitReactionRepository;

/**
 * 번역 결과를 *_translated 칸에 채운다 (번역 스레드에서 새 트랜잭션으로).
 * 번역하는 사이에 원문이 다시 바뀌었으면(빠르게 두 번 수정 등) 옛 번역으로 덮지 않도록 원문이 같을 때만 채운다.
 */
@Component
@RequiredArgsConstructor
public class TranslationWriter {

    private final SecretMapRepository mapRepository;
    private final SpotRepository spotRepository;
    private final SpotVisitRepository visitRepository;
    private final VisitReactionRepository reactionRepository;
    private final ChatMessageRepository messageRepository;

    /** @return 채웠으면 true (대상이 없거나 원문이 바뀌었으면 false) */
    @Transactional
    public boolean fill(TranslationTarget target, Long id, String original, String translated) {
        return switch (target) {
            case MAP_CAPTION -> mapRepository.findById(id)
                    .filter(m -> original.equals(m.getCaption()))
                    .map(m -> { m.fillTranslation(translated); return true; }).orElse(false);
            case SPOT_REASON -> spotRepository.findById(id)
                    .filter(s -> original.equals(s.getReason()))
                    .map(s -> { s.fillReasonTranslation(translated); return true; }).orElse(false);
            case SPOT_REVIEW -> spotRepository.findById(id)
                    .filter(s -> original.equals(s.getReview()))
                    .map(s -> { s.fillReviewTranslation(translated); return true; }).orElse(false);
            case VISIT_REVIEW -> visitRepository.findById(id)
                    .filter(v -> original.equals(v.getReview()))
                    .map(v -> { v.fillTranslation(translated); return true; }).orElse(false);
            case REACTION_COMMENT -> reactionRepository.findById(id)
                    .filter(r -> original.equals(r.getComment()))
                    .map(r -> { r.fillTranslation(translated); return true; }).orElse(false);
            case CHAT_MESSAGE -> messageRepository.findById(id)
                    .filter(c -> original.equals(c.getContent()))
                    .map(c -> { c.fillTranslation(translated); return true; }).orElse(false);
        };
    }
}
