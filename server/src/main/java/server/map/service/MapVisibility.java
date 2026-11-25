package server.map.service;

import server.global.config.PolicyProperties;
import server.map.repository.SpotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * [공용] 지도 공개 조건 F-13: 스팟 5곳 이상 + 공개 스팟 정확히 2곳.
 * 서버 A(코스 선택·지도 목록)와 서버 B(MAP-02 isPublic, 추천 후보)가 같은 기준을 쓰도록 한곳에 둔다.
 */
@Component
@RequiredArgsConstructor
public class MapVisibility {

    private final SpotRepository spotRepository;
    private final PolicyProperties policy;

    public boolean isPublic(Long mapId) {
        return isPublic(spotRepository.countByMapId(mapId), spotRepository.countByMapIdAndPreviewTrue(mapId));
    }

    public boolean isPublic(long spotCount, long previewCount) {
        return spotCount >= policy.mapMinSpots() && previewCount == policy.mapPreviewSpots();
    }
}
