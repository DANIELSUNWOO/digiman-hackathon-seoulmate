package server.map.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.global.common.LocalizedText;
import server.map.domain.SecretMap;
import server.map.domain.Spot;
import server.map.repository.SecretMapRepository;
import server.map.repository.SpotRepository;

import java.util.List;
import java.util.UUID;

/** [B 소유] 임시로 A가 작성한 동작하는 구현. 선우님이 자유롭게 수정 */
@Service
@RequiredArgsConstructor
public class MapQueryImpl implements MapQuery {

    /** 지도·스팟 글은 메이트(한국어)가 쓴다 */
    private static final String MAP_LANG = "ko";

    private final SecretMapRepository mapRepository;
    private final SpotRepository spotRepository;
    private final MapVisibility mapVisibility;

    @Override
    @Transactional(readOnly = true)
    public List<PublicMap> findPublicMaps(UUID mateId) {
        return mapRepository.findByMateIdOrderByIdAsc(mateId).stream()
                .filter(m -> mapVisibility.isPublic(m.getId()))
                .map(this::toPublicMap)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isPublic(Long mapId) {
        return mapVisibility.isPublic(mapId);
    }

    @Override
    @Transactional(readOnly = true)
    public long spotCount(Long mapId) {
        return spotRepository.countByMapId(mapId);
    }

    private PublicMap toPublicMap(SecretMap m) {
        List<PreviewSpot> previews = spotRepository.findByMapIdAndPreviewTrueOrderBySortOrderAscIdAsc(m.getId()).stream()
                .map(this::toPreview).toList();
        return new PublicMap(m.getId(), m.getTitle(), LocalizedText.of(m.getCaption(), m.getCaptionTranslated(), MAP_LANG),
                spotRepository.countByMapId(m.getId()), previews);
    }

    private PreviewSpot toPreview(Spot s) {
        return new PreviewSpot(s.getId(), s.getName(), s.getAddress(), s.getLat(), s.getLng(), s.photoUrls(),
                LocalizedText.of(s.getReason(), s.getReasonTranslated(), MAP_LANG),
                LocalizedText.of(s.getReview(), s.getReviewTranslated(), MAP_LANG));
    }
}
