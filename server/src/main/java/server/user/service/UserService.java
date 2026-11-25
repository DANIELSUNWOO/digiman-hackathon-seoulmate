package server.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import server.global.config.PolicyProperties;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.global.security.AuthUser;
import server.global.security.TokenUser;
import server.match.domain.Match;
import server.match.domain.MatchStatus;
import server.match.repository.MatchRepository;
import server.notification.domain.NotificationType;
import server.notification.service.NotificationPublisher;
import server.tag.repository.UserTagRepository;
import server.tag.service.TagService;
import server.trip.repository.TripRepository;
import server.user.domain.MatchPreference;
import server.user.domain.User;
import server.user.repository.MatchPreferenceRepository;
import server.user.repository.UserRepository;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** 티켓 2: 온보딩 (회원 등록, 내 정보, 여권, 프로필, 매칭 조건, 탈퇴) */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final MatchPreferenceRepository preferenceRepository;
    private final UserTagRepository userTagRepository;
    private final TripRepository tripRepository;
    private final MatchRepository matchRepository;
    private final TagService tagService;
    private final NotificationPublisher notificationPublisher;
    private final PolicyProperties policy;
    private final Clock clock;

    // ---------- AUTH-01 회원 등록 ----------
    /** Supabase 가입 직후 한 번. USERS.id = 토큰의 sub */
    @Transactional
    public UserDtos.RegisterResponse register(TokenUser token, UserDtos.RegisterRequest req) {
        if (!Boolean.TRUE.equals(req.agreeTerms())) throw new ApiException(ErrorCode.TERMS_NOT_AGREED);
        if (userRepository.existsById(token.id())) throw new ApiException(ErrorCode.USER_ALREADY_REGISTERED);
        User user = User.register(token.id(), req.country(), policy.freeMatchSlots(), LocalDateTime.now(clock));
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {        // 앱이 두 번 연속 호출한 경우
            throw new ApiException(ErrorCode.USER_ALREADY_REGISTERED);
        }
        return new UserDtos.RegisterResponse(user.getId(), user.getRole().name(), user.getLanguage());
    }

    // ---------- USER-01 내 정보 ----------
    /** 앱을 켤 때마다 호출. onboarding 을 보고 앱이 다음 화면을 정한다. 등록 전이면 404 USER_NOT_REGISTERED */
    @Transactional(readOnly = true)
    public UserDtos.MeResponse me(TokenUser token) {
        User u = userRepository.findById(token.id()).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_REGISTERED));
        if (!u.isActive()) throw new ApiException(ErrorCode.WITHDRAWN_USER);
        return toMe(u, token.email());
    }

    private UserDtos.MeResponse toMe(User u, String email) {
        LocalDate today = LocalDate.now(clock);
        UUID userId = u.getId();
        boolean traveler = u.isTraveler();

        UserDtos.Onboarding onboarding = new UserDtos.Onboarding(
                u.isVerified(),
                u.hasProfile(),
                userTagRepository.countByUserId(userId) > 0,
                traveler ? preferenceRepository.existsById(userId) : null,
                traveler ? tripRepository.findFirstByTravelerIdAndEndDateGreaterThanEqualOrderByIdDesc(userId, today).isPresent() : null);

        UserDtos.Slots slots = null;
        UserDtos.Capacity capacity = null;
        if (traveler) {
            slots = new UserDtos.Slots(u.getMatchSlots(), matchRepository.countByTravelerIdAndStatusIn(userId, MatchStatus.ACTIVE));
        } else {
            capacity = new UserDtos.Capacity(matchRepository.countByMateIdAndStatusIn(userId, MatchStatus.ACTIVE),
                    policy.mateMaxActiveMatches());
        }

        return new UserDtos.MeResponse(userId, email, u.getCountry(), u.getRole().name(), u.getLanguage(),
                u.getNickname(), u.getGender() == null ? null : u.getGender().name(), u.getBirthYear(), u.ageGroup(today),
                u.getProfileImageUrl(), u.getBio(), u.getVerifyStatus().name(),
                tagService.mine(userId, u.getLanguage()), onboarding, slots, capacity);
    }

    @Transactional(readOnly = true)
    public String languageOf(UUID userId) {
        return userRepository.findById(userId).map(User::getLanguage).orElse("ko");
    }

    // ---------- USER-02 여권 인증 ----------
    /** MVP: 사진은 받기만 하고 저장하지 않는다 (검증도 안 하는데 보관하면 개인정보 위험만 생김) */
    @Transactional
    public String verify(AuthUser me, MultipartFile passportImage) {
        if (passportImage == null || passportImage.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (passportImage.getSize() > 5L * 1024 * 1024) throw new ApiException(ErrorCode.FILE_TOO_LARGE);
        User u = load(me);
        u.verify();
        return u.getVerifyStatus().name();
    }

    // ---------- USER-03 / USER-04 프로필 ----------
    @Transactional
    public UserDtos.MeResponse registerProfile(AuthUser me, UserDtos.ProfileRequest req) {
        User u = load(me);
        if (u.hasProfile()) throw new ApiException(ErrorCode.PROFILE_ALREADY_REGISTERED);   // 수정은 USER-04
        int age = LocalDate.now(clock).getYear() - req.birthYear();
        if (age < policy.minAge()) throw new ApiException(ErrorCode.UNDER_AGE);
        String nickname = req.nickname().trim();
        checkNickname(nickname, u.getId());
        u.registerProfile(nickname, req.gender(), req.birthYear(), req.profileImageUrl(), req.bio());
        flushNickname();
        return toMe(u, me.email());
    }

    @Transactional
    public UserDtos.MeResponse updateProfile(AuthUser me, UserDtos.ProfileUpdateRequest req) {
        User u = load(me);
        if (!u.hasProfile()) throw new ApiException(ErrorCode.PROFILE_REQUIRED);
        String nickname = req.nickname() == null ? null : req.nickname().trim();
        if (nickname != null) checkNickname(nickname, u.getId());
        u.updateProfile(nickname, req.profileImageUrl(), req.bio());
        flushNickname();
        return toMe(u, me.email());
    }

    private void checkNickname(String nickname, UUID userId) {
        if (nickname.length() < 2 || nickname.length() > 12) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (userRepository.existsByNicknameAndIdNot(nickname, userId)) throw new ApiException(ErrorCode.NICKNAME_DUPLICATED);
    }

    /** 동시에 같은 닉네임으로 저장하면 Unique 제약이 막는다 → 409 로 변환 */
    private void flushNickname() {
        try {
            userRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(ErrorCode.NICKNAME_DUPLICATED);
        }
    }

    // ---------- PREF-01 / PREF-02 매칭 조건 ----------
    @Transactional(readOnly = true)
    public UserDtos.PreferenceDto preference(AuthUser me) {
        MatchPreference p = preferenceRepository.findById(me.id())
                .orElseThrow(() -> new ApiException(ErrorCode.PREFERENCES_NOT_FOUND));
        return new UserDtos.PreferenceDto(p.getGenderPref(), p.ageGroupList());
    }

    /** 저장 즉시 메이트 찾기(MATE-01) 목록에 반영된다 (v1.4) */
    @Transactional
    public UserDtos.PreferenceDto savePreference(AuthUser me, UserDtos.PreferenceDto req) {
        MatchPreference saved = preferenceRepository.findById(me.id())
                .map(p -> { p.update(req.genderPref(), req.ageGroups()); return p; })
                .orElseGet(() -> preferenceRepository.save(MatchPreference.of(me.id(), req.genderPref(), req.ageGroups())));
        return new UserDtos.PreferenceDto(saved.getGenderPref(), saved.ageGroupList());
    }

    // ---------- USER-05 회원 탈퇴 ----------
    @Transactional
    public void withdraw(AuthUser me) {
        User u = load(me);
        LocalDateTime now = LocalDateTime.now(clock);
        for (Match m : matchRepository.findMineForWithdraw(u.getId(), MatchStatus.ACTIVE)) {
            m.cancel(now);
            notificationPublisher.publish(m.partnerOf(u.getId()), NotificationType.CANCELED, m.getId(),
                    u.getNickname() == null ? "-" : u.getNickname());
        }
        u.withdraw();   // 행은 지우지 않는다 (매칭·신고 기록 보존). Supabase Auth 계정 삭제는 하지 않음
    }

    private User load(AuthUser me) {
        return userRepository.findById(me.id()).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_REGISTERED));
    }
}
