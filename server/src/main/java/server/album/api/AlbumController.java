package server.album.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import server.album.service.AlbumReviewService;
import server.global.common.Guards;
import server.global.security.AuthUser;

import java.util.List;

@Tag(name = "앨범·후기")
@RestController
@RequiredArgsConstructor
public class AlbumController {

    private final AlbumReviewService albumReviewService;

    @Operation(summary = "ALBUM-01 앨범 보기 (방문 기록·리액션을 모아서 보여 줌)")
    @GetMapping("/api/v1/matches/{matchId}/album")
    public AlbumReviewService.AlbumView album(AuthUser me, @PathVariable Long matchId) {
        return albumReviewService.album(me, matchId);
    }

    @Operation(summary = "ALBUM-02 앨범 제목·표지 수정 (여행자, 보낸 값만)")
    @PatchMapping("/api/v1/matches/{matchId}/album")
    public AlbumReviewService.AlbumView edit(AuthUser me, @PathVariable Long matchId,
                                             @Valid @RequestBody AlbumReviewService.AlbumPatch req) {
        Guards.requireTraveler(me);
        return albumReviewService.editAlbum(me, matchId, req);
    }

    @Operation(summary = "REVIEW-01 상호 후기 작성 (여행 완료 뒤 한 번, 받는 사람 = 매칭 상대)")
    @PostMapping("/api/v1/matches/{matchId}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public AlbumReviewService.ReviewCreated review(AuthUser me, @PathVariable Long matchId,
                                                   @Valid @RequestBody AlbumReviewService.ReviewRequest req) {
        return albumReviewService.review(me, matchId, req);
    }

    @Operation(summary = "REVIEW-02 후기 보기")
    @GetMapping("/api/v1/matches/{matchId}/reviews")
    public List<AlbumReviewService.ReviewView> reviews(AuthUser me, @PathVariable Long matchId) {
        return albumReviewService.reviews(me, matchId);
    }
}
