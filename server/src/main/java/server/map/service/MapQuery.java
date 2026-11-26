package server.map.service;

import server.global.common.LocalizedText;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** [B 소유 · A가 사용] 지도 조회. 지도 목록(MATCH-04)·코스 선택(MATCH-05)·필요 인증 수 계산에 쓴다 */
public interface MapQuery {

    /** 메이트의 공개 지도들: 캡션 + 공개 스팟 2곳만 (비공개 스팟 내용은 넣지 않는다) */
    List<PublicMap> findPublicMaps(UUID mateId);

    /** 노출 조건 F-13: 스팟 5곳 이상 + 공개 스팟 정확히 2곳 */
    boolean isPublic(Long mapId);

    long spotCount(Long mapId);

    record PublicMap(Long mapId, String title, LocalizedText caption, long spotCount, List<PreviewSpot> previewSpots) {}

    record PreviewSpot(Long spotId, String name, String address, BigDecimal lat, BigDecimal lng,
                       List<String> photos, LocalizedText reason, LocalizedText review) {}
}
