package server.global.error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/** API 명세서 v1.4 의 에러 코드. 앱은 code 를 보고 일본어/한국어 문구를 정한다. 새 코드는 여기에 추가 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // 공통
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "입력값을 확인해 주세요."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    ROLE_FORBIDDEN(HttpStatus.FORBIDDEN, "이 역할로는 사용할 수 없습니다."),
    NOT_VERIFIED(HttpStatus.FORBIDDEN, "여권 인증이 필요합니다."),
    NOT_MATCH_MEMBER(HttpStatus.FORBIDDEN, "이 매칭의 당사자가 아닙니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "대상을 찾을 수 없습니다."),
    CONFLICT(HttpStatus.CONFLICT, "지금 상태에서는 할 수 없습니다."),
    FILE_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "파일은 5MB까지 올릴 수 있습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."),

    // 회원/온보딩
    USER_NOT_REGISTERED(HttpStatus.NOT_FOUND, "회원 등록 전입니다."),
    USER_ALREADY_REGISTERED(HttpStatus.CONFLICT, "이미 등록된 회원입니다."),
    TERMS_NOT_AGREED(HttpStatus.BAD_REQUEST, "약관에 동의해야 합니다."),
    WITHDRAWN_USER(HttpStatus.FORBIDDEN, "탈퇴한 계정입니다."),
    UNDER_AGE(HttpStatus.BAD_REQUEST, "만 18세 이상만 가입할 수 있습니다."),
    NICKNAME_DUPLICATED(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),
    PROFILE_REQUIRED(HttpStatus.CONFLICT, "프로필을 먼저 등록해 주세요."),
    PROFILE_ALREADY_REGISTERED(HttpStatus.CONFLICT, "프로필이 이미 등록되어 있습니다. 수정은 PATCH /users/me 를 사용하세요."),
    TAG_COUNT_INVALID(HttpStatus.BAD_REQUEST, "취향은 1~10개 선택해 주세요."),
    INVALID_TAG(HttpStatus.BAD_REQUEST, "선택할 수 없는 취향입니다."),
    PREFERENCES_NOT_FOUND(HttpStatus.NOT_FOUND, "매칭 조건이 없습니다."),
    INVALID_DATE_RANGE(HttpStatus.BAD_REQUEST, "종료일이 시작일보다 빠릅니다."),
    PAST_DATE(HttpStatus.BAD_REQUEST, "종료일이 오늘보다 이전입니다."),
    TRIP_EXISTS(HttpStatus.CONFLICT, "진행 중인 여행 일정이 이미 있습니다."),
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "진행 중인 여행 일정이 없습니다."),

    // 메이트 찾기·매칭
    TRIP_REQUIRED(HttpStatus.CONFLICT, "진행 중인 여행 일정이 필요합니다."),
    PREFERENCES_REQUIRED(HttpStatus.CONFLICT, "매칭 조건을 먼저 저장해 주세요."),
    MATE_NOT_AVAILABLE(HttpStatus.BAD_REQUEST, "신청할 수 없는 메이트입니다."),
    NO_FREE_SLOT(HttpStatus.CONFLICT, "사용할 수 있는 매칭 칸이 없습니다."),
    MATE_FULL(HttpStatus.CONFLICT, "메이트의 동시 매칭 정원이 찼습니다."),
    ALREADY_MATCHED(HttpStatus.CONFLICT, "이 메이트와 이미 진행 중인 매칭이 있습니다."),
    MATCH_NOT_FOUND(HttpStatus.NOT_FOUND, "매칭을 찾을 수 없습니다."),
    MATCH_NOT_ACTIVE(HttpStatus.CONFLICT, "진행 중인 매칭이 아닙니다."),
    MATCH_NOT_ON_COURSE(HttpStatus.CONFLICT, "여행 중인 매칭이 아닙니다."),
    MATCH_NOT_COMPLETED(HttpStatus.CONFLICT, "여행 완료 전입니다."),
    MATE_CANNOT_CANCEL(HttpStatus.FORBIDDEN, "메이트는 매칭을 취소할 수 없습니다."),
    MAP_NOT_AVAILABLE(HttpStatus.BAD_REQUEST, "고를 수 없는 지도입니다."),
    COURSE_ALREADY_SELECTED(HttpStatus.CONFLICT, "이미 코스를 골랐습니다."),
    COURSE_NOT_SELECTED(HttpStatus.CONFLICT, "아직 코스를 고르지 않았습니다."),

    // 채팅
    CHAT_NOT_REQUESTED(HttpStatus.CONFLICT, "아직 채팅을 열 수 없습니다."),
    CHAT_ALREADY_OPEN(HttpStatus.CONFLICT, "채팅이 이미 열려 있습니다."),
    CHAT_NOT_OPEN(HttpStatus.CONFLICT, "채팅이 열려 있지 않습니다."),

    // 안전
    INVALID_TARGET(HttpStatus.BAD_REQUEST, "신고할 수 없는 대상입니다."),
    DETAIL_REQUIRED(HttpStatus.BAD_REQUEST, "기타 사유는 상세 내용이 필요합니다."),
    ALREADY_REPORTED(HttpStatus.CONFLICT, "이미 신고한 상대입니다."),
    ALREADY_BLOCKED(HttpStatus.CONFLICT, "이미 차단한 상대입니다."),
    NOT_BLOCKED_PARTY(HttpStatus.FORBIDDEN, "이 매칭에서 차단당한 사람이 아닙니다."),
    FEEDBACK_ALREADY_SUBMITTED(HttpStatus.CONFLICT, "이미 의견을 남겼습니다."),

    // 알림
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."),

    // 방문 인증 (서버 B)
    LOCATION_REQUIRED(HttpStatus.BAD_REQUEST, "위치 정보가 필요합니다."),
    OUT_OF_RANGE(HttpStatus.BAD_REQUEST, "스팟 근처(200m 이내)에서 다시 시도해 주세요.");

    private final HttpStatus status;
    private final String message;
}
