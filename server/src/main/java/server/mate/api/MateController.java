package server.mate.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import server.global.common.Guards;
import server.global.security.AuthUser;
import server.mate.service.MateSearchService;

@Tag(name = "매칭")
@RestController
@RequestMapping("/api/v1/mates")
@RequiredArgsConstructor
public class MateController {

    private final MateSearchService mateSearchService;

    @Operation(summary = "MATE-01 메이트 찾기 (목록 + 정렬·필터). sort = TASTE(기본) / PINS / RECENT / POPULAR, maxPins 생략 = 상한 없음")
    @GetMapping
    public MateSearchService.MateListResponse search(AuthUser me,
                                                     @RequestParam(required = false) String sort,
                                                     @RequestParam(required = false) Integer minPins,
                                                     @RequestParam(required = false) Integer maxPins,
                                                     @RequestParam(required = false) Integer page,
                                                     @RequestParam(required = false) Integer size) {
        Guards.requireTraveler(me);
        return mateSearchService.search(me.id(), sort, minPins, maxPins, page, size);
    }
}
