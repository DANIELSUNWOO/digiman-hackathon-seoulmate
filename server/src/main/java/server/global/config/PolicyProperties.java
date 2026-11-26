package server.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** ERD v2.4 5장 "서버 설정값". 숫자를 코드에 직접 쓰지 말고 여기서 꺼내 쓴다. */
@ConfigurationProperties(prefix = "seoulmate.policy")
public record PolicyProperties(
        int mateListPageSize,
        int mateMaxActiveMatches,
        int mapMinSpots,
        int mapPreviewSpots,
        double chatUnlockRatio,
        int visitRadiusMeters,
        int maxMatchSlots,
        int maxTags,
        int minAge
) {
    /** 채팅에 필요한 인증 수 = ceil(코스 스팟 수 × 0.5). 5곳 → 3, 6곳 → 3, 7곳 → 4 */
    public int requiredVisits(int courseSpotCount) {
        return (int) Math.ceil(courseSpotCount * chatUnlockRatio);
    }
}
