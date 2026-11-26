package server.map.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import server.global.common.Guards;
import server.global.security.AuthUser;
import server.map.service.MapService;

import java.util.List;

@Tag(name = "비밀지도 (메이트)")
@RestController
@RequiredArgsConstructor
public class MapController {

    private final MapService mapService;

    @Operation(summary = "MAP-01 지도 만들기 (메이트, 여권 인증 필요)")
    @PostMapping("/api/v1/maps")
    @ResponseStatus(HttpStatus.CREATED)
    public MapService.MapCreated create(AuthUser me, @Valid @RequestBody MapService.MapRequest req) {
        Guards.requireMate(me);
        return mapService.createMap(me, req);
    }

    @Operation(summary = "MAP-02 내 지도 목록 (공개 조건 충족 여부, 진행 중 코스 여부)")
    @GetMapping("/api/v1/maps/me")
    public List<MapService.MyMap> myMaps(AuthUser me) {
        Guards.requireMate(me);
        return mapService.myMaps(me);
    }

    @Operation(summary = "MAP-03 내 지도 상세 (스팟 전체, 작성자만)")
    @GetMapping("/api/v1/maps/{mapId}")
    public MapService.MapDetail detail(AuthUser me, @PathVariable Long mapId) {
        Guards.requireMate(me);
        return mapService.detail(me, mapId);
    }

    @Operation(summary = "MAP-04 지도 이름·캡션 수정")
    @PatchMapping("/api/v1/maps/{mapId}")
    public MapService.MapDetail edit(AuthUser me, @PathVariable Long mapId,
                                     @Valid @RequestBody MapService.MapPatch req) {
        Guards.requireMate(me);
        return mapService.editMap(me, mapId, req);
    }

    @Operation(summary = "MAP-05 지도 삭제 (진행 중 코스이거나 방문 기록이 있으면 409 MAP_IN_USE)")
    @DeleteMapping("/api/v1/maps/{mapId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(AuthUser me, @PathVariable Long mapId) {
        Guards.requireMate(me);
        mapService.deleteMap(me, mapId);
    }

    @Operation(summary = "MAP-06 공개 스팟 2곳 지정 (정확히 2곳)")
    @PutMapping("/api/v1/maps/{mapId}/previews")
    public MapService.PreviewResult previews(AuthUser me, @PathVariable Long mapId,
                                             @Valid @RequestBody MapService.PreviewRequest req) {
        Guards.requireMate(me);
        return mapService.setPreviews(me, mapId, req.spotIds());
    }

    @Operation(summary = "SPOT-01 스팟 등록 (사진 1~5장, 장소 검색은 앱에서)")
    @PostMapping("/api/v1/maps/{mapId}/spots")
    @ResponseStatus(HttpStatus.CREATED)
    public MapService.SpotCreated addSpot(AuthUser me, @PathVariable Long mapId,
                                          @Valid @RequestBody MapService.SpotRequest req) {
        Guards.requireMate(me);
        return mapService.addSpot(me, mapId, req);
    }

    @Operation(summary = "SPOT-02 스팟 수정 (보낸 값만)")
    @PatchMapping("/api/v1/spots/{spotId}")
    public MapService.SpotView editSpot(AuthUser me, @PathVariable Long spotId,
                                        @Valid @RequestBody MapService.SpotPatch req) {
        Guards.requireMate(me);
        return mapService.editSpot(me, spotId, req);
    }

    @Operation(summary = "SPOT-03 스팟 삭제")
    @DeleteMapping("/api/v1/spots/{spotId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSpot(AuthUser me, @PathVariable Long spotId) {
        Guards.requireMate(me);
        mapService.deleteSpot(me, spotId);
    }
}
