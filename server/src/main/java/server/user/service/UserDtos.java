package server.user.service;


import com.fasterxml.jackson.annotation.JsonInclude;
import server.tag.service.TagService;
import server.user.domain.Gender;
import server.user.domain.GenderPref;
import server.user.domain.MatchPreference;
import jakarta.validation.constraints.*;

import java.util.List;
import java.util.UUID;

public final class UserDtos {
    private UserDtos() {}

    public record ProfileRequest(
            @NotBlank @Size(min = 2, max = 12, message = "2~12자로 입력해 주세요.") String nickname,
            @NotNull Gender gender,
            @NotNull @Min(1900) @Max(2100) Integer birthYear,
            @Size(max = 500) String profileImageUrl,
            @Size(max = 200, message = "200자까지 입력할 수 있습니다.") String bio) {}

    /** 보낸 필드만 수정. 성별·출생연도는 받지 않는다 */
    public record ProfileUpdateRequest(
            @Size(min = 2, max = 12, message = "2~12자로 입력해 주세요.") String nickname,
            @Size(max = 500) String profileImageUrl,
            @Size(max = 200, message = "200자까지 입력할 수 있습니다.") String bio) {}

    /** PREF-01 응답 = PREF-02 요청. ageGroups: 20 / 30 / 40 / 50(50대 이상) 중 1개 이상 */
    public record PreferenceDto(
            @NotNull GenderPref genderPref,
            @NotEmpty List<Integer> ageGroups) {
        @AssertTrue(message = "ageGroups 는 20, 30, 40, 50 중에서 고를 수 있습니다.")
        public boolean isAgeGroupsValid() {
            return ageGroups == null || ageGroups.stream().allMatch(g -> g != null && MatchPreference.AGE_CHIPS.contains(g));
        }
    }

    /** AUTH-01 회원 등록 */
    public record RegisterRequest(
            @NotNull @Pattern(regexp = "JP|KR", message = "country 는 JP 또는 KR 입니다.") String country,
            @NotNull Boolean agreeTerms) {}

    public record RegisterResponse(UUID userId, String role, String language) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MeResponse(
            UUID userId, String email, String country, String role, String language,
            String nickname, String gender, Integer birthYear, Integer ageGroup,
            String profileImageUrl, String bio, String verifyStatus,
            List<TagService.TagView> tags, Onboarding onboarding,
            Slots slots, Capacity matchCapacity) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Onboarding(boolean verified, boolean profile, boolean tags, Boolean preferences, Boolean trip) {}

    public record Slots(int total, long used) {}

    public record Capacity(long active, int max) {}
}
