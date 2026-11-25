package server.user.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Persistable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 서비스용 회원 정보 (ERD v2.4).
 * id = Supabase 회원 id(auth.users.id, 토큰의 sub). 이메일·비밀번호는 Supabase Auth 가 관리하므로 여기 없다.
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User implements Persistable<UUID> {

    @Id
    private UUID id;

    @Column(nullable = false, length = 2)
    private String country;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false, length = 2)
    private String language;

    @Column(unique = true, length = 12)
    private String nickname;

    @Enumerated(EnumType.STRING) @Column(length = 10)
    private Gender gender;

    @Column(name = "birth_year")
    private Integer birthYear;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(length = 200)
    private String bio;

    @Enumerated(EnumType.STRING) @Column(name = "verify_status", nullable = false, length = 20)
    private VerifyStatus verifyStatus;

    @Column(name = "match_slots", nullable = false)
    private int matchSlots;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private UserStatus status;

    @Column(name = "terms_agreed_at", nullable = false)
    private LocalDateTime termsAgreedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * id 를 직접 넣는 엔티티라 Spring Data 가 "새 회원"인지 알 수 있게 표시한다.
     * 없으면 save() 가 INSERT 대신 merge 를 해서, 같은 id 로 두 번 등록할 때 덮어쓸 수 있다.
     */
    @Transient
    private boolean newEntity;

    @Override
    public boolean isNew() { return newEntity; }

    @PostLoad
    @PostPersist
    void markNotNew() { this.newEntity = false; }

    /** AUTH-01. country 로 역할과 언어가 정해진다: JP → 여행자/일본어, KR → 메이트/한국어 (F-01) */
    public static User register(UUID supabaseUserId, String country, int freeSlots, LocalDateTime now) {
        User u = new User();
        u.id = supabaseUserId;
        u.country = country;
        u.role = "JP".equals(country) ? Role.TRAVELER : Role.MATE;
        u.language = "JP".equals(country) ? "ja" : "ko";
        u.verifyStatus = VerifyStatus.NONE;
        u.matchSlots = freeSlots;
        u.status = UserStatus.ACTIVE;
        u.termsAgreedAt = now;
        u.createdAt = now;
        u.newEntity = true;
        return u;
    }

    public void verify() { this.verifyStatus = VerifyStatus.VERIFIED; }

    public void registerProfile(String nickname, Gender gender, int birthYear, String profileImageUrl, String bio) {
        this.nickname = nickname;
        this.gender = gender;
        this.birthYear = birthYear;
        this.profileImageUrl = profileImageUrl;
        this.bio = bio;
    }

    /** 성별·출생연도는 바꿀 수 없다 (USER-04) */
    public void updateProfile(String nickname, String profileImageUrl, String bio) {
        if (nickname != null) this.nickname = nickname;
        if (profileImageUrl != null) this.profileImageUrl = profileImageUrl;
        if (bio != null) this.bio = bio;
    }

    public void withdraw() { this.status = UserStatus.WITHDRAWN; }

    public boolean isVerified() { return verifyStatus == VerifyStatus.VERIFIED; }
    public boolean isActive() { return status == UserStatus.ACTIVE; }
    public boolean hasProfile() { return nickname != null && gender != null && birthYear != null; }
    public boolean isTraveler() { return role == Role.TRAVELER; }
    public boolean isMate() { return role == Role.MATE; }

    /** 명세: 나이 = 올해 − 출생연도 */
    public Integer age(LocalDate today) {
        return birthYear == null ? null : today.getYear() - birthYear;
    }

    /** 화면 표시용 연령대. 20 = 20대 */
    public Integer ageGroup(LocalDate today) {
        Integer age = age(today);
        return age == null ? null : (age / 10) * 10;
    }

    /** 매칭 조건 비교용 연령대 칩 값: 18~19세는 20, 50세 이상은 50 (API v1.4 PREF) */
    public Integer ageChip(LocalDate today) {
        Integer age = age(today);
        if (age == null) return null;
        if (age < 20) return 20;
        if (age >= 50) return 50;
        return (age / 10) * 10;
    }
}
