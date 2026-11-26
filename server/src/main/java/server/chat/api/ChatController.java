package server.chat.api;

import server.chat.service.ChatService;
import server.global.security.AuthUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "채팅")
@RestController
@RequestMapping("/api/v1/matches/{matchId}")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @Operation(summary = "CHAT-01 채팅 열기 (여행자, 필요 인증 수 달성 후 바로 OPEN)")
    @PostMapping("/chat/open")
    public ChatService.OpenResponse open(AuthUser me, @PathVariable Long matchId) {
        return chatService.open(me, matchId);
    }

    @Operation(summary = "CHAT-02 쪽지 목록 (after 이후, 오래된 순)")
    @GetMapping("/messages")
    public List<ChatService.MessageView> messages(AuthUser me, @PathVariable Long matchId,
                                                  @RequestParam(required = false) Long after,
                                                  @RequestParam(defaultValue = "50") int size) {
        return chatService.messages(me, matchId, after, size);
    }

    @Operation(summary = "CHAT-03 쪽지 보내기")
    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatService.MessageView send(AuthUser me, @PathVariable Long matchId,
                                        @Valid @RequestBody ChatService.SendRequest req) {
        return chatService.send(me, matchId, req.content());
    }
}
