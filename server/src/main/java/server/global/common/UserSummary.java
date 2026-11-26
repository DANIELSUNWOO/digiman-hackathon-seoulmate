package server.global.common;

import java.util.UUID;

import server.user.domain.User;

import java.time.LocalDate;

/** 명세서 0-5. 상대에게 보여 주는 최소 정보. 이메일·출생연도·연락처는 넣지 않는다 (F-38). */
public record UserSummary(UUID userId, String nickname, String gender, Integer ageGroup,
                          String profileImageUrl, String bio) {

    public static UserSummary of(User u, LocalDate today) {
        return new UserSummary(u.getId(), u.getNickname(),
                u.getGender() == null ? null : u.getGender().name(),
                u.ageGroup(today), u.getProfileImageUrl(), u.getBio());
    }
}
