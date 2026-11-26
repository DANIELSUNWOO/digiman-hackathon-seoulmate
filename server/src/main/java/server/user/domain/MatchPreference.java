package server.user.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/** 여행자의 매칭 조건 (ERD v2.4: 연령대는 칩 복수 선택, "20,30" 형태로 저장) */
@Entity
@Table(name = "match_preferences")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MatchPreference {

    public static final List<Integer> AGE_CHIPS = List.of(20, 30, 40, 50);

    @Id @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING) @Column(name = "gender_pref", nullable = false, length = 10)
    private GenderPref genderPref;

    @Column(name = "age_groups", nullable = false, length = 20)
    private String ageGroups;

    public static MatchPreference of(UUID userId, GenderPref pref, Collection<Integer> ageGroups) {
        MatchPreference p = new MatchPreference();
        p.userId = userId;
        p.update(pref, ageGroups);
        return p;
    }

    public void update(GenderPref pref, Collection<Integer> ageGroups) {
        this.genderPref = pref;
        this.ageGroups = ageGroups.stream().distinct().sorted().map(String::valueOf).collect(Collectors.joining(","));
    }

    public List<Integer> ageGroupList() {
        if (ageGroups == null || ageGroups.isBlank()) return List.of();
        return Arrays.stream(ageGroups.split(",")).map(String::trim).map(Integer::valueOf).toList();
    }

    public boolean acceptsAgeChip(Integer chip) {
        return chip != null && ageGroupList().contains(chip);
    }
}
