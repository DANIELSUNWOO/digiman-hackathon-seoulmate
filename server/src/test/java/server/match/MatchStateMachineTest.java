package server.match;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.match.domain.CancelReason;
import server.match.domain.ChatStatus;
import server.match.domain.Match;
import server.match.domain.MatchStatus;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** API v1.7 상태머신: 지도 선택 = 매칭 + 코스 확정, 채팅은 READY 후 여행자가 바로 열기 */
class MatchStateMachineTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 29, 10, 0);
    private static final UUID TRAVELER = UUID.randomUUID(), MATE = UUID.randomUUID();

    private final PolicyProperties policy = new PolicyProperties(20, 10, 5, 2, 0.5, 200, 5, 10, 18);

    /** 5곳 지도 → 필요 인증 2곳 */
    private Match newMatch() {
        return Match.create(100L, TRAVELER, MATE, 5L, 2, NOW);
    }

    private static ErrorCode codeOf(Throwable t) {
        return ((ApiException) t).getErrorCode();
    }

    @ParameterizedTest(name = "코스 스팟 {0}곳 → 채팅 필요 인증 {1}곳")
    @CsvSource({"5,2", "6,3", "7,3", "10,5", "11,5"})
    void 채팅_필요_인증수는_코스_스팟의_50퍼센트_내림(int spots, int expected) {
        assertThat(policy.requiredVisits(spots)).isEqualTo(expected);
    }

    @Test
    void 지도를_고르면_바로_ON_COURSE_이고_코스가_확정된다() {
        Match m = newMatch();
        assertThat(m.getStatus()).isEqualTo(MatchStatus.ON_COURSE);
        assertThat(m.getCourseMapId()).isEqualTo(5L);
        assertThat(m.getRequiredVisits()).isEqualTo(2);
        assertThat(m.getCourseSelectedAt()).isEqualTo(m.getMatchedAt());
        assertThat(m.getChatStatus()).isEqualTo(ChatStatus.LOCKED);
    }

    @Test
    void 정상_흐름_ON_COURSE_COMPLETED() {
        Match m = newMatch();
        m.complete(NOW);
        assertThat(m.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(m.getEndedAt()).isEqualTo(NOW);
    }

    @Test
    void 여행자도_메이트도_끊을_수_있고_사유와_끊은_사람이_남는다() {
        Match byTraveler = newMatch();
        byTraveler.cancel(TRAVELER, CancelReason.FEW_SPOTS, "  가고 싶은 곳이 적어요 ", NOW);
        assertThat(byTraveler.getStatus()).isEqualTo(MatchStatus.CANCELED);
        assertThat(byTraveler.getCanceledBy()).isEqualTo(TRAVELER);
        assertThat(byTraveler.getCancelReason()).isEqualTo(CancelReason.FEW_SPOTS);
        assertThat(byTraveler.getCancelDetail()).isEqualTo("가고 싶은 곳이 적어요");

        Match byMate = newMatch();
        byMate.cancel(MATE, null, null, NOW);                  // 사유는 선택
        assertThat(byMate.getStatus()).isEqualTo(MatchStatus.CANCELED);
        assertThat(byMate.getCanceledBy()).isEqualTo(MATE);
        assertThat(byMate.getCancelReason()).isNull();
    }

    @Test
    void 당사자가_아니면_끊을_수_없다() {
        assertThatThrownBy(() -> newMatch().cancel(UUID.randomUUID(), null, null, NOW))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.NOT_MATCH_MEMBER));
    }

    @Test
    void 끝난_매칭은_다시_끊거나_만료할_수_없다() {
        Match m = newMatch();
        m.cancel(TRAVELER, null, null, NOW);
        assertThatThrownBy(() -> m.cancel(TRAVELER, null, null, NOW))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.MATCH_NOT_ACTIVE));
        assertThatThrownBy(() -> m.expire(NOW)).satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.MATCH_NOT_ACTIVE));
    }

    @Test
    void 필요_인증수에_처음_닿는_순간에만_READY() {
        Match m = newMatch();
        assertThat(m.markChatReadyIfReached(1)).isFalse();
        assertThat(m.getChatStatus()).isEqualTo(ChatStatus.LOCKED);
        assertThat(m.markChatReadyIfReached(2)).isTrue();
        assertThat(m.getChatStatus()).isEqualTo(ChatStatus.READY);
        assertThat(m.markChatReadyIfReached(3)).isFalse();
    }

    @Test
    void READY_가_되면_여행자가_바로_연다_메이트_수락_없음() {
        Match m = newMatch();
        m.markChatReadyIfReached(2);
        assertThat(m.canOpenChat(TRAVELER)).isTrue();
        assertThat(m.canOpenChat(MATE)).isFalse();
        m.openChat(TRAVELER);
        assertThat(m.getChatStatus()).isEqualTo(ChatStatus.OPEN);
        assertThat(m.canMessage()).isTrue();
        assertThatThrownBy(() -> m.openChat(TRAVELER))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.CHAT_ALREADY_OPEN));
    }

    @Test
    void 채팅_열기_실패_경우() {
        Match locked = newMatch();
        assertThatThrownBy(() -> locked.openChat(TRAVELER))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.CHAT_NOT_READY));

        Match ready = newMatch();
        ready.markChatReadyIfReached(2);
        assertThatThrownBy(() -> ready.openChat(MATE))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.ROLE_FORBIDDEN));
        assertThatThrownBy(() -> ready.openChat(UUID.randomUUID()))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.NOT_MATCH_MEMBER));

        ready.cancel(TRAVELER, null, null, NOW);
        assertThatThrownBy(() -> ready.openChat(TRAVELER))
                .satisfies(t -> assertThat(codeOf(t)).isEqualTo(ErrorCode.MATCH_NOT_ACTIVE));
    }

    @Test
    void 끝난_매칭은_READY_로_바뀌지_않는다() {
        Match m = newMatch();
        m.cancel(TRAVELER, null, null, NOW);
        assertThat(m.markChatReadyIfReached(5)).isFalse();
        assertThat(m.getChatStatus()).isEqualTo(ChatStatus.LOCKED);
    }

    @Test
    void 차단은_채팅_전에도_가능하고_진행_중이면_BLOCKED() {
        Match m = newMatch();
        assertThat(m.blockIfActive(NOW)).isTrue();
        assertThat(m.getStatus()).isEqualTo(MatchStatus.BLOCKED);
        assertThat(m.getEndedAt()).isEqualTo(NOW);
        assertThat(m.canMessage()).isFalse();
    }

    @Test
    void 이미_끝난_매칭을_차단하면_상태는_그대로() {
        Match m = newMatch();
        m.complete(NOW);
        assertThat(m.blockIfActive(NOW)).isFalse();
        assertThat(m.getStatus()).isEqualTo(MatchStatus.COMPLETED);
    }
}
