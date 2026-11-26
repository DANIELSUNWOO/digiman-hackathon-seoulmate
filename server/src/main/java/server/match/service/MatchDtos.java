package server.match.service;

import com.fasterxml.jackson.annotation.JsonInclude;
import server.global.common.LocalizedText;
import server.global.common.UserSummary;
import server.match.domain.CancelReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class MatchDtos {
    private MatchDtos() {}

    // ---------- 요청 ----------
    /** MATCH-01 (API v1.7): 지도 카드를 고르면 그 지도로 매칭 + 코스 확정 */
    public record ApplyRequest(@NotNull Long mapId) {}
    /** MATCH-07 (모두 생략 가능) */
    public record CancelRequest(CancelReason reason, @Size(max = 300, message = "300자까지 입력할 수 있습니다.") String detail) {}
    public record CompleteRequest(@Size(max = 100) String albumTitle, @Size(max = 500) String coverUrl) {}

    // ---------- 공통 조각 ----------
    public record Progress(long visited, Integer required, long total) {}
    /** title: 여행자에게는 LocalizedText, 메이트에게는 한국어 문자열 (명세 MATCH-02) */
    public record CourseMap(Long mapId, Object title) {}
    public record TripRange(LocalDate startDate, LocalDate endDate) {}
    public record Slots(int total, long used) {}
    public record Chat(String status, boolean canOpen) {}

    // ---------- 응답 ----------
    public record ApplyResponse(Long matchId, String status, String chatStatus, UserSummary mate,
                                CourseMap courseMap, Progress progress, OffsetDateTime matchedAt, Slots slots) {}

    /** MATCH-02 목록 항목 */
    public record MatchItem(Long matchId, String status, String chatStatus, UserSummary partner,
                            CourseMap courseMap, Progress progress, TripRange trip, OffsetDateTime lastVisitAt) {}

    /** MATCH-03 상세 = 목록 항목 + 채팅·시각·앨범 */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record MatchDetail(Long matchId, String status, String chatStatus, UserSummary partner,
                              CourseMap courseMap, Progress progress, TripRange trip, OffsetDateTime lastVisitAt,
                              Chat chat, OffsetDateTime matchedAt, OffsetDateTime courseSelectedAt,
                              OffsetDateTime endedAt, Long albumId, boolean feedbackAvailable) {}

    /** MATCH-06 코스 지도 */
    public record CourseView(MapHeader map, Progress progress, List<CourseSpot> spots) {}
    public record MapHeader(Long mapId, Object title, LocalizedText caption) {}

    public record CourseSpot(Long spotId, String name, String address, BigDecimal lat, BigDecimal lng,
                             List<String> photos, LocalizedText reason, LocalizedText review,
                             boolean visited, Long visitId) {}

    /** MATCH-07 응답. slots 는 여행자에게만 */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CancelResponse(Long matchId, String status, Slots slots) {}
    public record CompleteResponse(Long matchId, String status, Long albumId, Slots slots) {}
}
