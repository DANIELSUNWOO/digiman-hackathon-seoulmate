package server.match;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.match.domain.ChatStatus;
import server.match.domain.Match;
import server.match.domain.MatchStatus;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MatchStateMachineTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 29, 10, 0);
    private static final UUID TRAVELER = UUID.randomUUID(), MATE = UUID.randomUUID();

    private final PolicyProperties policy = new PolicyProperties(20, 10, 5, 2, 0.5, 200, 1, 10, 18);

    private Match newMatch() {
        return Match.create(100L, TRAVELER, MATE, NOW);
    }

    private static ErrorCode codeOf(Throwable t) {
        return ((ApiException) t).getErrorCode();
    }

    private static Match chatOpen(Match m) {
        m.selectCourse(5L, 3, NOW);
        m.requestChatIfReached(3);
        m.answerChat(TRAVELER, true);
        m.answerChat(MATE, true);
        return m;
    }

    @ParameterizedTest(name = "코스 스팟 {0}곳 → 채팅 필요 인증 {1}곳")
    @CsvSource({"5,3", "6,3", "7,4", "10,5"})
    void 채팅_필요_인증수는_코스_스팟의_50퍼센트_올림(int spots, int expected) {
        assertThat(policy.requiredVisits(spots)).isEqualTo(expected);
    }

    @Test
    void 정상_흐름_MATCHED_ON_COURSE_COMPLETED() {
        Match m = newMatch();
        m.selectCourse(5L, 3, NOW);
        assertThat(m.getStatus()).isEqualTo(MatchStatus.ON_COURSE);
        m.complete(NOW);
        assertThat(m.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(m.getEndedAt()).isEqualTo(NOW);
    }

    @Test
    void 코스는_한번만_고를_수_있다() {
        Match m = newMatch();
        m.selectCourse(5L, 3, NOW);
        assertThatThrownBy(() -> m.selectCourse(6L, 3, NOW))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.COURSE_ALREADY_SELECTED));
    }

    @Test
    void 코스_선택_전에는_완료할_수_없다() {
        assertThatThrownBy(() -> newMatch().complete(NOW))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.MATCH_NOT_ON_COURSE));
    }

    @Test
    void 끝난_매칭은_다시_취소하거나_만료할_수_없다() {
        Match m = newMatch();
        m.cancel(NOW);
        assertThatThrownBy(() -> m.cancel(NOW)).satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.MATCH_NOT_ACTIVE));
        assertThatThrownBy(() -> m.expire(NOW)).satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.MATCH_NOT_ACTIVE));
    }

    @Test
    @DisplayName("필요 인증 수에 처음 도달한 순간에만 채팅 요청이 생긴다")
    void 채팅_요청은_한번만() {
        Match m = newMatch();
        m.selectCourse(5L, 3, NOW);
        assertThat(m.requestChatIfReached(2)).isFalse();
        assertThat(m.requestChatIfReached(3)).isTrue();
        assertThat(m.getChatStatus()).isEqualTo(ChatStatus.REQUESTED);
        assertThat(m.requestChatIfReached(4)).isFalse();
    }

    @Test
    void 채팅은_양쪽이_모두_수락해야_열리고_거절_후_다시_수락할_수_있다() {
        Match m = newMatch();
        m.selectCourse(5L, 3, NOW);
        m.requestChatIfReached(3);
        assertThat(m.answerChat(TRAVELER, true)).isFalse();
        assertThat(m.answerChat(MATE, false)).isFalse();
        assertThat(m.getChatStatus()).isEqualTo(ChatStatus.REQUESTED);
        assertThat(m.answerChat(MATE, true)).isTrue();
        assertThat(m.getChatStatus()).isEqualTo(ChatStatus.OPEN);
        assertThat(m.canMessage()).isTrue();
    }

    @Test
    void 인증_전에는_채팅_수락을_할_수_없다() {
        assertThatThrownBy(() -> newMatch().answerChat(TRAVELER, true))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.CHAT_NOT_REQUESTED));
    }

    @Test
    void 당사자가_아니면_채팅_수락_불가() {
        Match m = newMatch();
        m.selectCourse(5L, 3, NOW);
        m.requestChatIfReached(3);
        assertThatThrownBy(() -> m.answerChat(UUID.randomUUID(), true))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.NOT_MATCH_MEMBER));
    }

    @Test
    void 차단은_채팅이_열린_뒤에만_가능하고_이후_쪽지_불가() {
        Match m = newMatch();
        m.selectCourse(5L, 3, NOW);
        assertThatThrownBy(() -> m.block(NOW)).satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.CHAT_NOT_OPEN));
        m.requestChatIfReached(3);
        m.answerChat(TRAVELER, true);
        m.answerChat(MATE, true);
        m.block(NOW);
        assertThat(m.getStatus()).isEqualTo(MatchStatus.BLOCKED);
        assertThat(m.canMessage()).isFalse();
    }

    @Test
    void 완료_후에도_채팅과_차단은_가능() {
        Match m = chatOpen(newMatch());
        m.complete(NOW);
        assertThat(m.canMessage()).isTrue();
        m.block(NOW);
        assertThat(m.getStatus()).isEqualTo(MatchStatus.BLOCKED);
    }
}
