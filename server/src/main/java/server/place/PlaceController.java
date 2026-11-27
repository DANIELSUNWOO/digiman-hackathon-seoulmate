package server.place;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import server.global.common.Guards;
import server.global.security.AuthUser;

import java.util.List;

@Tag(name = "비밀지도")
@RestController
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceSearchService placeSearchService;

    @Operation(summary = "PLACE-01 장소 검색 (스팟 등록용, 메이트. 네이버 지역 검색 최대 5개)")
    @GetMapping("/api/v1/places/search")
    public List<PlaceSearchService.Place> search(AuthUser me, @RequestParam(required = false) String query) {
        Guards.requireMate(me);
        return placeSearchService.search(query);
    }
}
