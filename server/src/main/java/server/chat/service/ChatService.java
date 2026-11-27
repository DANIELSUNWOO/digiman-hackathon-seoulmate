package server.chat.service;

import java.util.UUID;

import server.chat.domain.ChatMessage;
import server.chat.repository.ChatMessageRepository;
import server.global.common.LocalizedText;
import server.global.common.Times;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.event.TranslationTarget;
import server.global.security.AuthUser;
import server.match.domain.Match;
import server.match.service.MatchAccess;
import server.notification.domain.NotificationType;
import server.notification.service.NotificationPublisher;
import server.user.domain.User;
import server.user.repository.UserRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import server.translation.TranslationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

/** 티켓 6: 채팅 열기(여행자, 50% 달성 후), 쪽지 */
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int MAX_PAGE = 100;

    private final MatchAccess matchAccess;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notificationPublisher;
    private final TranslationService translationService;
    private final Clock clock;

    /**
     * CHAT-01 채팅 열기 (API v1.7). 필요 인증 수를 채워 READY 가 되면 여행자가 누르는 순간 바로 OPEN.
     * 메이트 수락 단계는 없다. 메이트에게 CHAT_OPEN 알림 (M-30).
     */
    @Transactional
    public OpenResponse open(AuthUser me, Long matchId) {
        Match m = matchAccess.memberForUpdate(matchId, me);
        m.openChat(me.id());                 // ROLE_FORBIDDEN / CHAT_NOT_READY / CHAT_ALREADY_OPEN / MATCH_NOT_ACTIVE
        notificationPublisher.publish(m.getMateId(), NotificationType.CHAT_OPEN, matchId);
        return new OpenResponse(m.getId(), m.getChatStatus().name());
    }

    /** CHAT-02 쪽지 목록 (오래된 순). 앱은 5~10초마다 after=마지막 messageId 로 새 쪽지만 가져온다 */
    @Transactional
    public List<MessageView> messages(AuthUser me, Long matchId, Long after, int size) {
        Match m = matchAccess.member(matchId, me);
        if (!m.canMessage()) throw new ApiException(ErrorCode.CHAT_NOT_OPEN);
        int pageSize = Math.min(Math.max(size, 1), MAX_PAGE);
        List<ChatMessage> rows = messageRepository.findByMatchIdAndIdGreaterThanOrderByIdAsc(
                matchId, after == null ? 0L : after, PageRequest.of(0, pageSize));
        messageRepository.markRead(matchId, me.id(), LocalDateTime.now(clock));   // 상대가 보낸 쪽지 읽음 처리
        return rows.stream().map(c -> view(c, m, me.id())).toList();
    }

    /** CHAT-03 쪽지 보내기. 원문을 저장하고 번역은 서버 B 번역 담당이 이벤트로 채운다 */
    @Transactional
    public MessageView send(AuthUser me, Long matchId, String content) {
        Match m = matchAccess.member(matchId, me);
        if (!m.canMessage()) throw new ApiException(ErrorCode.CHAT_NOT_OPEN);
        String text = content.strip();
        if (text.isEmpty() || text.length() > 500) throw new ApiException(ErrorCode.VALIDATION_ERROR);

        ChatMessage saved = messageRepository.save(ChatMessage.of(matchId, me.id(), text, LocalDateTime.now(clock)));
        String from = langOf(m, me.id());
        String to = langOf(m, m.partnerOf(me.id()));
        if (!from.equals(to)) {
            translationService.translateAsync(TranslationTarget.CHAT_MESSAGE, saved.getId(), text, from, to);   // B 구현
        }
        return view(saved, m, me.id());
    }

    /** 여행자 = 일본어, 메이트 = 한국어 */
    private String langOf(Match m, UUID userId) {
        return m.getTravelerId().equals(userId) ? "ja" : "ko";
    }

    private MessageView view(ChatMessage c, Match m, UUID viewerId) {
        return new MessageView(c.getId(), c.getSenderId(), c.getSenderId().equals(viewerId),
                LocalizedText.of(c.getContent(), c.getContentTranslated(), langOf(m, c.getSenderId())),
                Times.kst(c.getCreatedAt()), Times.kst(c.getReadAt()));
    }

    public record OpenResponse(Long matchId, String chatStatus) {}
    public record SendRequest(@NotBlank @Size(max = 500, message = "500자까지 보낼 수 있습니다.") String content) {}
    public record MessageView(Long messageId, UUID senderId, boolean mine, LocalizedText content,
                              OffsetDateTime createdAt, OffsetDateTime readAt) {}
}
