package server.user.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.global.common.Guards;
import server.global.security.AuthUser;
import server.global.security.TokenUser;
import server.user.service.UserDtos;
import server.user.service.UserService;

import java.util.Map;

@Tag(name = "회원/온보딩")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "AUTH-01 회원 등록 (Supabase 가입 직후 국적·약관 저장)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDtos.RegisterResponse register(TokenUser token, @Valid @RequestBody UserDtos.RegisterRequest req) {
        return userService.register(token, req);
    }

    @Operation(summary = "USER-01 내 정보 + 온보딩 진행 상태 + 칸/정원 (등록 전이면 404 USER_NOT_REGISTERED)")
    @GetMapping("/me")
    public UserDtos.MeResponse me(TokenUser token) {
        return userService.me(token);
    }

    @Operation(summary = "USER-02 여권 인증 (MVP: 업로드만, 사진은 저장하지 않음)")
    @PostMapping(value = "/me/verification", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> verify(AuthUser me, @RequestPart("passportImage") MultipartFile passportImage) {
        return Map.of("verifyStatus", userService.verify(me, passportImage));
    }

    @Operation(summary = "USER-03 프로필 최초 등록 (만 18세 이상)")
    @PutMapping("/me/profile")
    public UserDtos.MeResponse registerProfile(AuthUser me, @Valid @RequestBody UserDtos.ProfileRequest req) {
        return userService.registerProfile(me, req);
    }

    @Operation(summary = "USER-04 프로필 수정 (닉네임·사진·소개글)")
    @PatchMapping("/me")
    public UserDtos.MeResponse updateProfile(AuthUser me, @Valid @RequestBody UserDtos.ProfileUpdateRequest req) {
        return userService.updateProfile(me, req);
    }

    @Operation(summary = "USER-05 회원 탈퇴 (진행 중 매칭은 모두 취소)")
    @DeleteMapping("/me")
    public ResponseEntity<Void> withdraw(AuthUser me) {
        userService.withdraw(me);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "PREF-01 매칭 조건 조회 (여행자)")
    @GetMapping("/me/match-preferences")
    public UserDtos.PreferenceDto preference(AuthUser me) {
        Guards.requireTraveler(me);
        return userService.preference(me);
    }

    @Operation(summary = "PREF-02 매칭 조건 저장 (여행자, 연령대 칩 ageGroups)")
    @PutMapping("/me/match-preferences")
    public UserDtos.PreferenceDto savePreference(AuthUser me, @Valid @RequestBody UserDtos.PreferenceDto req) {
        Guards.requireTraveler(me);
        return userService.savePreference(me, req);
    }
}
