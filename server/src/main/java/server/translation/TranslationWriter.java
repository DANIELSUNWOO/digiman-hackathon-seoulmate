package server.translation;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import server.global.event.TranslationTarget;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;
import server.visit.repository.SpotVisitRepository;
import server.visit.repository.VisitReactionRepository;

/**
 * 번역 결과를 *_translated 칸에 채운다 (번역 스레드에서 새 트랜잭션으로).
 *
 * 다른 저장과 겹쳐도 값이 사라지지 않게 하는 장치:
 * - 지도·스팟·방문·댓글 엔티티는 @DynamicUpdate 라서 번역 칸 하나만 UPDATE 된다
 *   (추천 이유 번역과 후기 번역이 동시에 저장되거나, 번역 저장과 이름·주소 수정이 겹쳐도 서로 덮지 않는다)
 * - 수정할 수 있는 글(캡션, 추천 이유, 후기)은 행을 잠그고 원문이 같을 때만 채운다.
 *   스팟·지도 수정(MapService)도 같은 행을 잠그므로, 원문이 바뀐 뒤 옛 번역이 들어가는 일이 없다
 * - 쪽지는 서버 A 엔티티라 번역 칸만 바꾸는 UPDATE 쿼리를 쓴다 (쪽지 원문은 수정되지 않는다)
 */
@Component
@RequiredArgsConstructor
public class TranslationWriter {

    private final SecretMapRepository mapRepository;
    private final SpotRepository spotRepository;
    private final SpotVisitRepository visitRepository;
    private final VisitReactionRepository reactionRepository;
    private final TranslationQueries queries;

    /** @return 채웠으면 true (대상이 없거나 원문이 바뀌었으면 false) */
    @Transactional
    public boolean fill(TranslationTarget target, Long id, String original, String translated) {
        return switch (target) {
            case MAP_CAPTION -> mapRepository.findByIdForUpdate(id)
                    .filter(m -> original.equals(m.getCaption()))
                    .map(m -> { m.fillTranslation(translated); return true; }).orElse(false);
            case SPOT_REASON -> spotRepository.findByIdForUpdate(id)
                    .filter(s -> original.equals(s.getReason()))
                    .map(s -> { s.fillReasonTranslation(translated); return true; }).orElse(false);
            case SPOT_REVIEW -> spotRepository.findByIdForUpdate(id)
                    .filter(s -> original.equals(s.getReview()))
                    .map(s -> { s.fillReviewTranslation(translated); return true; }).orElse(false);
            case VISIT_REVIEW -> visitRepository.findById(id)
                    .filter(v -> original.equals(v.getReview()))
                    .map(v -> { v.fillTranslation(translated); return true; }).orElse(false);
            case REACTION_COMMENT -> reactionRepository.findById(id)
                    .filter(r -> original.equals(r.getComment()))
                    .map(r -> { r.fillTranslation(translated); return true; }).orElse(false);
            case CHAT_MESSAGE -> queries.fillChatTranslation(id, translated) > 0;
        };
    }
}
