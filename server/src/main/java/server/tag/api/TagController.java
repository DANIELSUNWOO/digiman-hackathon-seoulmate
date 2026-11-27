package server.tag.api;

import server.global.security.AuthUser;
import server.tag.service.TagService;
import server.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@io.swagger.v3.oas.annotations.tags.Tag(name = "회원/온보딩")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
public class TagController {

    private final TagService tagService;
    private final UserService userService;

    @Operation(summary = "TAG-01 취향 목록 (분류 → 항목 → 세부 3단계, category 로 분류 구분)")
    @GetMapping("/tags")
    public List<TagService.TagTree> tags(AuthUser me) {
        return tagService.tree(userService.languageOf(me.id()));
    }

    @Operation(summary = "TAG-02 내 취향 저장 (통째로 교체, 1개 이상·개수 제한 없음, 항목·세부 모두 가능)")
    @PutMapping("/users/me/tags")
    public Map<String, List<TagService.TagView>> saveMine(AuthUser me,
                                                           @RequestBody SaveTagsRequest req) {
        return Map.of("tags", tagService.replaceMine(me.id(), userService.languageOf(me.id()), req.tagIds()));
    }

    public record SaveTagsRequest(@NotNull List<Long> tagIds) {}
}
