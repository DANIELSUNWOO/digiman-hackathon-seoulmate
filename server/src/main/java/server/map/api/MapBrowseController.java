package server.map.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import server.global.common.Guards;
import server.global.security.AuthUser;
import server.map.service.MapBrowseService;

@Tag(name = "지도 고르기 (여행자)")
@RestController
@RequiredArgsConstructor
public class MapBrowseController {

    private final MapBrowseService mapBrowseService;

    @Operation(summary = "MAP-07 지도 고르기 (카드 1장 = 지도 1개). sort 생략 = 추천순 / PINS_ASC / PINS_DESC / RECENT / POPULAR, maxPins 생략 = 상한 없음, areaTagId = 미니 지도에서 고른 동네(AREA 태그). 응답 areas = 동네별 지도 수")
    @GetMapping("/api/v1/maps")
    public MapBrowseService.MapBrowseResponse browse(AuthUser me,
                                                     @RequestParam(required = false) String sort,
                                                     @RequestParam(required = false) Integer minPins,
                                                     @RequestParam(required = false) Integer maxPins,
                                                     @RequestParam(required = false) Long areaTagId,
                                                     @RequestParam(required = false) Integer page,
                                                     @RequestParam(required = false) Integer size) {
        Guards.requireTraveler(me);
        return mapBrowseService.browse(me.id(), sort, minPins, maxPins, areaTagId, page, size);
    }

    @Operation(summary = "MAP-08 공개 스팟 미리보기 (매칭 전, 숨긴 스팟은 개수만)")
    @GetMapping("/api/v1/maps/{mapId}/preview")
    public MapBrowseService.MapPreview preview(AuthUser me, @PathVariable Long mapId) {
        Guards.requireTraveler(me);
        return mapBrowseService.preview(me.id(), mapId);
    }
}
