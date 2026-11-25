package server.match.service;

import com.fasterxml.jackson.annotation.JsonInclude;
import server.global.common.LocalizedText;
import server.global.common.UserSummary;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class MatchDtos {
    private MatchDtos() {}

    // ---------- 요청 ----------
    public record ApplyRequest(@NotNull UUID mateId) {}
    public record CourseRequest(@NotNull Long mapId) {}
    public record CompleteRequest(@Size(max = 100) String albumTitle, @Size(max = 500) String coverUrl) {}

    // ---------- 공통 조각 ----------
    public record Progress(long visited, Integer required, long total) {}
    public record CourseMap(Long mapId, String title) {}
    public record TripRange(LocalDate startDate, LocalDate endDate) {}
    public record Slots(int total, long used) {}
    public record Chat(String status, Boolean myAccept, boolean partnerAccepted) {}

    // ---------- 응답 ----------
    public record ApplyResponse(Long matchId, String status, String chatStatus, UserSummary mate,
                                OffsetDateTime matchedAt, Slots slots) {}

    /** MATCH-02 목록 항목 */
    public record MatchItem(Long matchId, String status, String chatStatus, UserSummary partner,
                            CourseMap courseMap, Progress progress, TripRange trip, OffsetDateTime lastVisitAt) {}

    /** MATCH-03 상세 = 목록 항목 + 채팅·시각·앨범 */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record MatchDetail(Long matchId, String status, String chatStatus, UserSummary partner,
                              CourseMap courseMap, Progress progress, TripRange trip, OffsetDateTime lastVisitAt,
                              Chat chat, OffsetDateTime matchedAt, OffsetDateTime courseSelectedAt,
                              OffsetDateTime endedAt, Long albumId) {}

    /** MATCH-04 메이트 지도 (공개 스팟 2곳만 내용 포함) */
    public record MateMap(Long mapId, String title, LocalizedText caption, long spotCount, List<SpotView> previewSpots) {}

    /** MATCH-06 코스 지도 */
    public record CourseView(MapHeader map, Progress progress, List<CourseSpot> spots) {}
    public record MapHeader(Long mapId, String title, LocalizedText caption) {}

    public record SpotView(Long spotId, String name, String address, BigDecimal lat, BigDecimal lng,
                           List<String> photos, LocalizedText reason, LocalizedText review) {}

    public record CourseSpot(Long spotId, String name, String address, BigDecimal lat, BigDecimal lng,
                             List<String> photos, LocalizedText reason, LocalizedText review,
                             boolean visited, Long visitId) {}

    public record CourseSelected(Long matchId, String status, Long courseMapId, Progress progress) {}
    public record CancelResponse(Long matchId, String status, Slots slots) {}
    public record CompleteResponse(Long matchId, String status, Long albumId, Slots slots) {}
}
