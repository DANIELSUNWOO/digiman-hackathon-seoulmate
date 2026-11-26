# 서울메이트 API 명세서 v1.7 (11/26)

> 기준 문서: 요구사항정의서 v3.4, ERD v2.6, **화면 명세 v9(프로토타입 v9)**. 요구사항정의서와 다르면 화면 명세 v9를 따른다
> v1.7 변경: 화면 명세 v9 반영. **지도 카드를 고르면 바로 매칭 + 코스 확정**(MATE-01·MATCH-04·MATCH-05 삭제, 지도 고르기 MAP-07·공개 스팟 미리보기 MAP-08 추가, MATCH-01은 mapId로), 채팅은 50% 달성 후 여행자가 바로 열기(CHAT-01), 필요 인증 수는 **내림**, 메이트도 매칭 끊기(MATCH-07), 리액션 3종 토글과 댓글 분리(VISIT-03~05), 스팟 사진 최대 3장, 지도 수정 잠금, 닉네임 8자, 취향 대분류당 2개, 신고 사유 추가, 기간 만료에도 앨범, 활동 요약(USER-06). 바뀐 곳은 0-3, 1장 목록, USER-03, USER-06, TAG-02, MAP-01~08, SPOT-01~03, MATCH-01~08, VISIT-01~05, CHAT-01, ALBUM-01, REPORT-01, 알림 표, 서버 배치, 3·4·6·7장
> v1.6 변경: 서버 B 구현에 맞춰 정리. 지도·스팟 삭제 불가 조건(MAP_IN_USE)을 넓힘, 수정 API 응답 형식 명시, 차단 관계에서는 리액션·후기 불가, 상호 후기는 아직 번역하지 않음, 에러 코드 추가(MAP_NOT_FOUND, SPOT_NOT_FOUND, VISIT_NOT_FOUND, ALBUM_NOT_FOUND, ALREADY_REVIEWED). 바뀐 곳은 MAP-01·02·03·04·05, SPOT-01·02·03, VISIT-01·02·03, ALBUM-01·02, REVIEW-01·02, 6장
> v1.5 변경: 11/25 회의 반영. 여행자 매칭 칸 무료 5칸, 차단은 양쪽 모두 언제든(사유 필수), 차단당한 쪽 피드백 API(BLOCK-03) 추가, 차단당한 쪽에는 상태를 ENDED로 표시. 바뀐 곳은 USER-01, MATCH-01·02·03·07·08, REPORT-01, BLOCK-01·03, 알림 표, 화면 매핑
> v1.4 변경: 기술 스택 확정(Supabase + Spring Boot). 회원가입·로그인은 Supabase Auth, 이미지는 Supabase Storage에 앱이 직접 업로드. AUTH-01을 "회원 등록"으로 변경, AUTH-02·UPLOAD-01은 Supabase 사용으로 대체. 사용자 id는 uuid
> v1.3 변경: 인증 50% 이상인데 여행 완료를 누르지 않은 매칭은 종료일이 지나면 자동 완료. 바뀐 곳은 DEV-01, MATCH-08, 알림 표, 서버 배치
> v1.2 변경: "오늘의 추천(REC-01)"을 "메이트 찾기(MATE-01, 목록 + 정렬·필터)"로 교체, 매칭 신청은 mateId로, 매칭 조건 연령대는 칩 목록(ageGroups)으로 변경, DEV-02 삭제. 바뀐 곳은 PREF, MATE-01, MATCH-01, MATCH-07, 시연 흐름, 화면 매핑, 5~7장
> v1.1 변경: 채팅 열림·자동 종료 기준을 "5곳"에서 "코스 지도 스팟의 50%"로 변경. 바뀐 곳은 MATCH-02·05·06, VISIT-01, CHAT-01, 서버 배치, 시연 흐름, 7장
> 표기: 각 API 옆의 F-xx는 요구사항 ID입니다. 우선순위 **P0** = 시연 필수, **P1** = 서비스 완성에 필요, **P2** = 시간이 되면.

---

## 0. 공통 규칙

### 0-0. 시스템 구성

| 무엇 | 어디서 | 앱이 쓰는 방법 |
| --- | --- | --- |
| 회원가입·로그인·로그아웃·토큰 갱신 | **Supabase Auth** | Supabase JS SDK (`supabase.auth.*`) |
| 이미지 업로드 | **Supabase Storage** | Supabase JS SDK (`supabase.storage`) → 받은 공개 URL을 Spring API에 넣는다 |
| 그 밖의 모든 데이터 | **Spring Boot API** (이 문서) | `Authorization: Bearer {Supabase access token}` |
| DB | Supabase Postgres | **앱은 직접 접근하지 않는다.** 모든 테이블에 RLS를 켜고 허용 정책을 두지 않는다. Spring만 DB에 접속한다 |

- Spring은 Supabase가 공개하는 JWKS(`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`)로 토큰 서명을 직접 검증하고, 토큰의 `sub`(Supabase 회원 id, uuid)를 USERS.id로 쓴다.
- Spring의 DB 접속 주소는 Supabase 대시보드의 **Session pooler** 주소를 쓴다 (direct 주소는 IPv6라 배포 환경에 따라 연결이 안 됨).
- 비밀 값(DB 비밀번호, service_role 키, LLM 키, 장소 검색 키)은 Spring 서버의 환경변수에만 둔다. 앱에는 Supabase URL, 공개(anon) 키, API 주소, 네이버 지도 Client ID만 들어간다.

### 0-1. 기본

| 항목 | 규칙 |
| --- | --- |
| Base URL | `/api/v1` |
| 데이터 형식 | JSON, 필드 이름은 camelCase (`matchId`, `courseMapId`) |
| 날짜 | 날짜는 `YYYY-MM-DD`, 시각은 ISO 8601 (`2026-11-29T14:03:00+09:00`) |
| 기준 시간대 | **Asia/Seoul**. "자동 종료·자동 완료"의 하루 기준도 서울 시간 (일본과 시차 없음) |
| 인증 | Supabase 로그인 후 받은 access token을 헤더에 넣는다: `Authorization: Bearer {accessToken}` |
| 토큰 | 유효기간과 갱신은 Supabase SDK가 처리한다. 앱은 호출할 때마다 SDK에서 현재 세션의 토큰을 꺼내 쓴다 |
| 로그아웃 (F-42) | API 없음. `supabase.auth.signOut()` |
| 이미지 | Supabase Storage에 직접 올리고 받은 URL을 다른 API에 넣는다 (아래 UPLOAD 참고) |
| 사용자 id | `userId`, `senderId` 등 사용자 id는 Supabase 회원 id(uuid 문자열)다. 이 문서 예시의 숫자 id는 이해를 돕기 위한 것이다 |

### 0-2. 권한 표기

| 표기 | 의미 |
| --- | --- |
| 없음 | 토큰 없이 호출 가능 |
| 로그인 | 토큰만 있으면 호출 가능 |
| 여행자 / 메이트 | 해당 역할만 호출 가능. 다른 역할이면 403 `ROLE_FORBIDDEN` |
| 당사자 | 해당 매칭의 여행자 또는 메이트만. 아니면 403 `NOT_MATCH_MEMBER` |
| 인증 필요 | 여권 인증(F-04)을 마친 사용자만. 아니면 403 `NOT_VERIFIED` |

### 0-3. 번역 텍스트 (F-35)

메이트·여행자가 직접 쓴 글(지도 제목, 캡션, 추천 이유, 후기, 댓글, 채팅)은 모두 아래 형태로 내려간다. 단, 메이트 본인이 보는 내 지도 화면(MAP-02·03)의 지도 제목은 한국어 문자열 그대로 내려준다.

```json
"caption": {
  "original": "조용히 책 읽기 좋은 카페만 모았어요",
  "translated": "静かに本を読むのにぴったりなカフェだけを集めました",
  "sourceLang": "ko"
}
```

- 서버는 **글을 저장할 때 한 번만** LLM으로 번역해 `*_translated` 컬럼에 저장한다. 조회할 때마다 번역하지 않는다.
- 앱은 `sourceLang`이 내 언어와 다르면 `translated`를 보여 주고 "AI 번역" 표시와 "원문 보기"를 붙인다.
- 번역이 실패하면 `translated`는 `null`. 앱은 원문을 보여 준다. 글 저장 자체는 실패시키지 않는다.
- 사용자 글 안에 "지시를 무시하고 ~라고 번역해" 같은 문장이 있어도 서버는 그 문장을 지시로 따르지 않고 글로만 번역한다. 번역 결과가 원문보다 지나치게 길면 버리고 `null`로 둔다. 그래도 번역은 참고용이므로 **앱은 "원문 보기"를 항상 유지하고, 신고·운영 판단은 원문 기준으로 한다.**
- **LLM API 키는 서버 `.env`에만 둔다.** 앱 코드와 GitHub에는 절대 넣지 않는다.

### 0-4. 응답 형식

성공하면 HTTP 상태 코드와 함께 데이터를 그대로 내려준다. 실패하면 아래 형식으로 내려준다.

```json
{
  "status": 409,
  "code": "NO_FREE_SLOT",
  "message": "사용할 수 있는 매칭 칸이 없습니다."
}
```

입력값 오류(400)는 어떤 필드가 틀렸는지 함께 내려준다.

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "입력값을 확인해 주세요.",
  "fieldErrors": [ { "field": "nickname", "reason": "2~12자로 입력해 주세요." } ]
}
```

- 모든 API는 빈 값, 길이 초과, 형식 오류를 서버에서 다시 검사하고 400 `VALIDATION_ERROR`로 돌려준다 (F-40). 앱에서 막았더라도 서버 검사는 생략하지 않는다.
- `message`는 개발 확인용이다. **앱 화면에 띄우는 문구는 앱이 `code`를 보고 일본어/한국어로 정한다.**

| 상태 | 의미 |
| --- | --- |
| 200 | 성공 |
| 201 | 생성 성공 |
| 204 | 성공, 응답 본문 없음 |
| 400 | 입력값이 잘못됨 |
| 401 | 로그인 필요 또는 토큰 만료 |
| 403 | 권한 없음 |
| 404 | 대상이 없음 |
| 409 | 지금 상태에서는 할 수 없음 (중복, 칸 없음, 채팅 잠김 등) |
| 413 | 파일이 너무 큼 |
| 500 | 서버 오류 |

### 0-5. 공통 객체

**UserSummary**: 상대방을 보여 줄 때 쓰는 최소 정보. 실명·이메일·연락처는 절대 넣지 않는다 (F-38).

```json
{ "userId": 7, "nickname": "서울토박이", "gender": "FEMALE", "ageGroup": 20, "profileImageUrl": "https://...", "bio": "..." }
```

- `ageGroup`은 출생연도로 계산한 연령대다 (20 = 20대). 출생연도 자체는 상대에게 보내지 않는다.

**Tag**: 취향 이름은 요청한 사용자의 언어로 내려준다 (여행자 = name_ja, 메이트 = name_ko).

```json
{ "tagId": 12, "name": "静かなカフェ", "parentId": 3 }
```

---

## 1. API 목록

### 회원/온보딩

| ID | Method | URL | 설명 | 권한 | 요구사항 | 우선 |
| --- | --- | --- | --- | --- | --- | --- |
| (Supabase) | – | `supabase.auth.signUp / signInWithPassword` | 회원가입·로그인 | 없음 | F-02, F-03 | P0 |
| AUTH-01 | POST | /users | 회원 등록 (Supabase 가입 직후 국적·약관 저장) | 로그인 | F-01, F-02 | P0 |
| USER-01 | GET | /users/me | 내 정보 + 온보딩 진행 상태 + 칸/정원 | 로그인 | F-06, F-18, F-23 | P0 |
| USER-02 | POST | /users/me/verification | 여권 인증 (MVP는 업로드만) | 로그인 | F-04 | P0 |
| USER-03 | PUT | /users/me/profile | 프로필 최초 등록 | 로그인 | F-05, F-06 | P0 |
| USER-04 | PATCH | /users/me | 프로필 수정 | 로그인 | F-41 | P1 |
| USER-05 | DELETE | /users/me | 회원 탈퇴 | 로그인 | F-43 | P1 |
| USER-06 | GET | /users/me/stats | 마이페이지 활동 요약 3칸 | 로그인 | C-02 | P1 |
| TAG-01 | GET | /tags | 취향 목록 (대분류 → 세부) | 로그인 | F-07 | P0 |
| TAG-02 | PUT | /users/me/tags | 내 취향 저장 | 로그인 | F-07, F-41 | P0 |
| PREF-01 | GET | /users/me/match-preferences | 매칭 조건 조회 | 여행자 | F-08 | P1 |
| PREF-02 | PUT | /users/me/match-preferences | 매칭 조건 저장 | 여행자 | F-08 | P0 |
| TRIP-01 | POST | /trips | 여행 일정 등록 | 여행자 | F-09 | P0 |
| TRIP-02 | GET | /trips/current | 진행 중인 여행 일정 | 여행자 | F-09 | P0 |
| TRIP-03 | PATCH | /trips/{tripId} | 여행 일정 수정 | 여행자 | F-09 | P1 |
| UPLOAD-01 | (Supabase) | Storage `images` 버킷 | 이미지 업로드 → URL (앱이 직접) | 로그인 | F-06, F-11, F-26 | P0 |

### 비밀지도 (메이트)

| ID | Method | URL | 설명 | 권한 | 요구사항 | 우선 |
| --- | --- | --- | --- | --- | --- | --- |
| MAP-01 | POST | /maps | 지도 만들기 | 메이트, 인증 필요 | F-10 | P0 |
| MAP-02 | GET | /maps/me | 내 지도 목록 + 공개 조건 충족 여부 | 메이트 | F-13, F-UI-15 | P0 |
| MAP-03 | GET | /maps/{mapId} | 내 지도 상세 (스팟 전체) | 메이트(작성자) | F-10, F-11 | P0 |
| MAP-04 | PATCH | /maps/{mapId} | 지도 이름·캡션 수정 | 메이트(작성자) | F-14 | P1 |
| MAP-05 | DELETE | /maps/{mapId} | 지도 삭제 | 메이트(작성자) | F-14 | P1 |
| MAP-06 | PUT | /maps/{mapId}/previews | 공개 스팟 2곳 지정 | 메이트(작성자) | F-12 | P0 |
| SPOT-01 | POST | /maps/{mapId}/spots | 스팟 등록 | 메이트(작성자) | F-11 | P0 |
| SPOT-02 | PATCH | /spots/{spotId} | 스팟 수정 | 메이트(작성자) | F-14 | P1 |
| SPOT-03 | DELETE | /spots/{spotId} | 스팟 삭제 | 메이트(작성자) | F-14 | P1 |
| MAP-07 | GET | /maps | 지도 고르기 (지도 카드 목록 + 정렬·필터) | 여행자, 인증 필요 | T-11 | P0 |
| MAP-08 | GET | /maps/{mapId}/preview | 공개 스팟 미리보기 (매칭 전) | 여행자, 인증 필요 | T-11b | P0 |

### 매칭

| ID | Method | URL | 설명 | 권한 | 요구사항 | 우선 |
| --- | --- | --- | --- | --- | --- | --- |
| MATCH-01 | POST | /matches | 지도 선택 = 매칭 + 코스 확정 | 여행자, 인증 필요 | T-11b | P0 |
| MATCH-02 | GET | /matches | 내 매칭 목록 | 로그인 | F-UI-07, F-UI-15 | P0 |
| MATCH-03 | GET | /matches/{matchId} | 매칭 상세 (상태·진행률·채팅 상태) | 당사자 | F-25, F-29 | P0 |
| MATCH-06 | GET | /matches/{matchId}/course | 코스 지도 (스팟 전체 + 스탬프) | 당사자 | F-25 | P0 |
| MATCH-07 | POST | /matches/{matchId}/cancel | 매칭 끊기 (여행자·메이트, 사유 선택) | 당사자 | T-92, T-93, M-93 | P1 |
| MATCH-08 | POST | /matches/{matchId}/complete | 여행 완료 + 앨범 생성 | 여행자(당사자) | F-32, F-33 | P0 |

### 탐방 · 채팅 · 여행 완료

| ID | Method | URL | 설명 | 권한 | 요구사항 | 우선 |
| --- | --- | --- | --- | --- | --- | --- |
| VISIT-01 | POST | /matches/{matchId}/visits | 방문 인증 (위치 1회 확인) | 여행자(당사자) | F-26, F-27, F-29 | P0 |
| VISIT-02 | GET | /matches/{matchId}/visits | 방문 기록 목록 (리액션 포함) | 당사자 | F-27, F-UI-17 | P0 |
| VISIT-03 | PUT | /visits/{visitId}/reaction | 리액션 누르기·바꾸기 (3종 중 1개) | 메이트(당사자) | M-23 | P0 |
| VISIT-04 | DELETE | /visits/{visitId}/reaction | 리액션 해제 | 메이트(당사자) | M-23 | P1 |
| VISIT-05 | POST | /visits/{visitId}/comments | 댓글 | 메이트(당사자) | M-23 | P0 |
| CHAT-01 | POST | /matches/{matchId}/chat/open | 채팅 열기 (여행자, 50% 달성 후) | 여행자(당사자) | T-27 | P0 |
| CHAT-02 | GET | /matches/{matchId}/messages | 쪽지 목록 | 당사자 | F-31 | P0 |
| CHAT-03 | POST | /matches/{matchId}/messages | 쪽지 보내기 | 당사자 | F-31, F-35 | P0 |
| ALBUM-01 | GET | /matches/{matchId}/album | 앨범 보기 | 당사자 | F-33 | P0 |
| ALBUM-02 | PATCH | /matches/{matchId}/album | 앨범 제목·표지 수정 | 여행자(당사자) | F-33 | P2 |
| REVIEW-01 | POST | /matches/{matchId}/reviews | 상호 후기 작성 | 당사자 | F-34 | P1 |
| REVIEW-02 | GET | /matches/{matchId}/reviews | 후기 보기 | 당사자 | F-34 | P1 |

### 안전 · 알림

| ID | Method | URL | 설명 | 권한 | 요구사항 | 우선 |
| --- | --- | --- | --- | --- | --- | --- |
| REPORT-01 | POST | /reports | 신고 (어디서나) | 당사자 | F-36 | P1 |
| BLOCK-01 | POST | /matches/{matchId}/block | 차단 (언제든, 사유 필수) | 당사자 | F-37 | P1 |
| BLOCK-02 | GET | /users/me/blocks | 내 차단 목록 | 로그인 | F-37, F-UI-18 | P2 |
| BLOCK-03 | POST | /matches/{matchId}/block-feedback | 차단당한 쪽 피드백 | 당사자(차단당한 쪽) | F-44 | P2 |
| NOTI-01 | GET | /notifications | 알림 목록 | 로그인 | F-39 | P0 |
| NOTI-02 | GET | /notifications/unread-count | 안 읽은 알림 수 (홈 배지) | 로그인 | F-39 | P1 |
| NOTI-03 | PATCH | /notifications/{notificationId}/read | 알림 읽음 | 로그인 | F-39 | P1 |
| NOTI-04 | PATCH | /notifications/read-all | 전체 읽음 | 로그인 | F-39 | P2 |

### 시연 전용 (DEMO_MODE=true일 때만 열림)

| ID | Method | URL | 설명 | 우선 |
| --- | --- | --- | --- | --- |
| DEV-01 | POST | /dev/expire-matches | 자동 종료·자동 완료 배치를 지금 바로 실행 (F-24 시연용) | P2 |

> 방문 인증 위치 확인 건너뛰기도 `DEMO_MODE=true`로 켠다 (VISIT-01 참고). 발표장이 서울이 아니어도 시연할 수 있게 하기 위해서다. **운영 환경에서는 반드시 꺼 둔다.**

---

## 2. API 상세

### 회원/온보딩

#### (Supabase) 회원가입·로그인 · F-02, F-03
앱이 Supabase SDK로 직접 처리한다. Spring API는 없다.

```ts
await supabase.auth.signUp({ email, password })              // 가입
await supabase.auth.signInWithPassword({ email, password })  // 로그인
const { data } = await supabase.auth.getSession()            // API 호출 때 data.session.access_token 사용
```

- 비밀번호 최소 길이(8자)는 Supabase 대시보드 Auth 설정에서 정한다. 이메일 중복·비밀번호 불일치 에러도 Supabase가 돌려준다.
- 시연을 위해 **이메일 인증(Confirm email)은 끈다.** 켜 두면 가입 후 메일을 열어야 로그인이 된다.
- 소셜 로그인(카카오·LINE)은 P1. 붙여도 Spring 쪽은 바뀌지 않는다.

#### AUTH-01 회원 등록
`POST /users` · 로그인 · F-01, F-02

Supabase 가입 직후 한 번 호출해서 서비스용 회원(USERS)을 만든다. 국적은 앱 첫 화면에서 고른 값이다.

```json
// 요청
{ "country": "JP", "agreeTerms": true }
// 응답 201
{ "userId": "8f1c...", "role": "TRAVELER", "language": "ja" }
```

- `country`가 `JP`면 role = TRAVELER, language = ja. `KR`이면 MATE, ko.
- USERS.id = 토큰의 sub. 약관 동의 시각을 `terms_agreed_at`에 저장한다.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | country 값 오류 |
| 400 | TERMS_NOT_AGREED | agreeTerms가 false |
| 409 | USER_ALREADY_REGISTERED | 이미 등록된 회원 |

#### USER-01 내 정보
`GET /users/me` · 로그인 · F-06, F-18, F-23

앱을 켤 때마다(Supabase 세션이 있으면) 호출해서 **어느 화면으로 보낼지** 정한다 (`onboarding` 값을 보고 아직 안 한 단계로 이동).

- 회원 등록(AUTH-01) 전이면 404 `USER_NOT_REGISTERED`. 앱은 국적 선택 화면으로 보낸다.
- 탈퇴한 회원이면 403 `WITHDRAWN_USER`.
- `email`은 토큰에서 읽어 내려준다 (USERS에는 저장하지 않음).

```json
// 응답 200 (여행자)
{
  "userId": 1,
  "email": "yuki@example.com",
  "country": "JP",
  "role": "TRAVELER",
  "language": "ja",
  "nickname": "ゆき",
  "gender": "FEMALE",
  "birthYear": 2001,
  "ageGroup": 20,
  "profileImageUrl": "https://...",
  "bio": "韓国カフェ巡りが好き",
  "verifyStatus": "VERIFIED",
  "tags": [ { "tagId": 12, "name": "静かなカフェ", "parentId": 3 } ],
  "onboarding": { "verified": true, "profile": true, "tags": true, "preferences": true, "trip": false },
  "slots": { "total": 5, "used": 0 }
}
```

- 여행자 칸은 무료 5칸이다 (`total` = USERS.match_slots, 기본 5).
- 메이트는 `slots` 대신 `"matchCapacity": { "active": 3, "max": 10 }`를 내려준다 (메이트 홈의 n / 10).
- 메이트의 `onboarding`에는 preferences, trip이 없다.

#### USER-02 여권 인증
`POST /users/me/verification` · 로그인 · F-04
`Content-Type: multipart/form-data`, 필드 `passportImage`

```json
// 응답 200
{ "verifyStatus": "VERIFIED" }
```

- **MVP는 사진을 받기만 하고 저장하지 않는다.** 실제 검증을 하지 않는데 여권 사진을 보관하면 개인정보 위험만 생기기 때문이다. 받은 뒤 바로 `verify_status = VERIFIED`로 바꾼다.

#### USER-03 프로필 최초 등록
`PUT /users/me/profile` · 로그인 · F-05, F-06

```json
// 요청
{ "nickname": "ゆき", "gender": "FEMALE", "birthYear": 2001, "profileImageUrl": "https://...", "bio": "韓国カフェ巡りが好き" }
// 응답 200: USER-01과 같은 형태
```

- 성별·출생연도는 여기서 한 번만 입력하고, 이후 수정(USER-04)에서는 바꿀 수 없다. 매칭 조건의 기준이 되는 값이라서다.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | 필수값 누락, 닉네임 2~8자 아님, 소개글 200자 초과 |
| 400 | UNDER_AGE | 올해 − 출생연도 < 18 |
| 409 | NICKNAME_DUPLICATED | 닉네임 중복 |

#### USER-04 프로필 수정
`PATCH /users/me` · 로그인 · F-41
보낸 필드만 바뀐다: `nickname`, `profileImageUrl`, `bio`. 응답은 USER-01과 같다. 에러는 USER-03과 같다 (UNDER_AGE 제외). 취향 수정은 TAG-02를 쓴다.

#### USER-05 회원 탈퇴
`DELETE /users/me` · 로그인 · F-43 → `204`

- `status = WITHDRAWN`으로 바꾸고(삭제하지 않음), 진행 중인 매칭(ON_COURSE)은 모두 CANCELED로 바꾸고 상대에게 CANCELED 알림을 보낸다.
- 메이트가 탈퇴하면 그 지도들이 지도 고르기 목록(MAP-07)에서 빠지고 더 이상 조회되지 않는다.

#### USER-06 활동 요약
`GET /users/me/stats` · 로그인 · C-02 (마이페이지 "わたしの足あと" 3칸)

```json
// 응답 200 (여행자)
{ "tripDay": 6, "matesMet": 2, "visitedSpots": 7 }
// 응답 200 (메이트)
{ "activeDays": 41, "travelersMet": 5, "completedMaps": 2 }
```

| 값 | 계산 |
| --- | --- |
| tripDay | 진행 중인 여행 일정의 시작일부터 오늘까지 며칠째인지 (시작 전이거나 일정이 없으면 null) |
| matesMet / travelersMet | 한 번이라도 매칭한 상대 수 (같은 사람은 1번) |
| visitedSpots | 내가 인증한 스팟 수 (전체 매칭 합계) |
| activeDays | 가입일부터 오늘까지 일수 |
| completedMaps | 공개 조건(스팟 5곳 이상 + 공개 스팟 2곳)을 채운 내 지도 수 |

#### TAG-01 취향 목록
`GET /tags` · 로그인 · F-07

```json
// 응답 200 (메이트가 요청한 경우 한국어)
[
  { "tagId": 3, "name": "카페", "children": [
      { "tagId": 12, "name": "조용한 카페" },
      { "tagId": 13, "name": "디저트 카페" }
  ]},
  { "tagId": 4, "name": "맛집", "children": [ ... ] }
]
```

- 취향 목록은 DB에 미리 넣어 두는 고정 데이터다 (V3 마이그레이션, 화면 명세 v9 T-05·M-04 기준).
  - 분류 7개: 카페·맛집 / 동네 산책 / 문화 / 쇼핑 / 스포츠 / 웰니스 / 동네(AREA). 항목 30개
  - **동네(AREA)는 메이트의 "잘 아는 동네"(M-04)용**이다. 여행자 취향 설문(T-05)에서는 앱이 이 분류를 숨긴다
  - T-05a 세부 선택(3단계)은 결선 버전에서 넣지 않는다

#### TAG-02 내 취향 저장
`PUT /users/me/tags` · 로그인 · F-07, F-41

```json
// 요청: 기존 선택을 통째로 이 목록으로 바꾼다
{ "tagIds": [12, 13, 27] }
// 응답 200
{ "tags": [ { "tagId": 12, "name": "조용한 카페", "parentId": 3 }, ... ] }
```

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | TAG_COUNT_INVALID | 0개, 또는 한 대분류에서 3개 이상 (대분류당 최대 2개, T-05) |
| 400 | INVALID_TAG | 없는 태그, 또는 대분류(depth 1) 태그 (세부 취향만 선택) |

#### PREF-01 / PREF-02 매칭 조건
`GET /users/me/match-preferences`, `PUT /users/me/match-preferences` · 여행자 · F-08

```json
// PUT 요청 = GET 응답
{ "genderPref": "ANY", "ageGroups": [20, 30] }
```

- genderPref: `ANY`(상관없음) / `SAME`(같은 성별) / `MALE` / `FEMALE`
- ageGroups: 연령대 칩 복수 선택. `20`(20대) / `30`(30대) / `40`(40대) / `50`(50대 이상). 1개 이상, 다른 값이나 빈 배열이면 400 `VALIDATION_ERROR`
- 만 18~19세 메이트는 20대로 계산한다 (가입 최소 나이가 18세라서 10대 칩을 따로 두지 않음).
- 저장 즉시 지도 고르기 목록(MAP-07)에 반영된다.

#### TRIP-01 / TRIP-02 / TRIP-03 여행 일정
`POST /trips`, `GET /trips/current`, `PATCH /trips/{tripId}` · 여행자 · F-09

```json
// POST 요청
{ "startDate": "2026-11-28", "endDate": "2026-12-01" }
// 응답 201 (GET /trips/current 응답도 같은 형태)
{ "tripId": 12, "startDate": "2026-11-28", "endDate": "2026-12-01" }
```

- MVP는 **진행 중인 일정을 1개만** 가진다 (종료일이 오늘 이후인 일정). 이미 있으면 새로 만들지 않고 수정(PATCH)한다.
- GET /trips/current는 일정이 없으면 `404 TRIP_NOT_FOUND`. 앱은 이걸 보고 일정 입력 화면으로 보낸다.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | INVALID_DATE_RANGE | 종료일이 시작일보다 빠름 |
| 400 | PAST_DATE | 종료일이 오늘보다 이전 |
| 409 | TRIP_EXISTS | 진행 중인 일정이 이미 있는데 POST |

#### UPLOAD-01 이미지 업로드 (Supabase Storage)
앱이 Supabase Storage에 직접 올린다. Spring API는 없다.

```ts
const path = `${purpose}/${userId}/${uuid()}.jpg`   // purpose: profile / spot / visit / album
await supabase.storage.from('images').upload(path, file, { contentType: 'image/jpeg' })
const { data } = supabase.storage.from('images').getPublicUrl(path)  // data.publicUrl을 다른 API에 넣는다
```

| 설정 | 값 |
| --- | --- |
| 버킷 | `images` (MVP는 public 읽기) |
| 업로드 권한 | 로그인한 사용자가 **자기 userId 폴더에만** 올릴 수 있게 Storage 정책 설정 |
| 파일 | jpg·png·heic·webp, 1장 최대 5MB (버킷 설정) |

- 파일 이름은 무작위 uuid로 해서 URL을 추측할 수 없게 한다.
- 앱에서 올리기 전에 긴 변 1600px 정도로 줄이면 업로드가 빨라진다.
- **여권 사진은 Storage에 올리지 않는다.** USER-02(Spring)로만 보내고 서버는 저장하지 않는다.

---

### 비밀지도 (메이트)

#### MAP-01 지도 만들기
`POST /maps` · 메이트, 인증 필요 · F-10

```json
// 요청
{ "title": "혼자 가기 좋은 성수 카페", "caption": "조용히 책 읽기 좋은 카페만 모았어요" }
// 응답 201
{ "mapId": 5 }
```

- 캡션은 저장할 때 일본어로 번역해 둔다 (0-3).
- title 1~30자, caption 0~300자.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | title 비어 있음·30자 초과, caption 300자 초과 |
| 403 | NOT_VERIFIED | 여권 인증 전 |
| 403 | ROLE_FORBIDDEN | 여행자가 호출 |

#### MAP-02 내 지도 목록
`GET /maps/me` · 메이트 · F-13, F-UI-15

```json
// 응답 200
[
  {
    "mapId": 5,
    "title": "혼자 가기 좋은 성수 카페",
    "caption": { "original": "...", "translated": "...", "sourceLang": "ko" },
    "spotCount": 4,
    "previewCount": 2,
    "isPublic": false,
    "inUse": false,
    "selectedCount": 3,
    "travelingCount": 0
  }
]
```

- `isPublic` = 스팟 5곳 이상 + 공개 스팟 2곳 (F-13). false면 메이트 홈에 "스팟 4 / 5"처럼 표시.
- `inUse` = 이 지도로 여행 중인 여행자가 있는지. true면 수정·삭제 버튼을 막는다 (아래 "지도 수정 잠금").
- `selectedCount` = 이 지도가 코스로 선택된 누적 횟수 (M-10 "코스로 선택 3회"), `travelingCount` = 지금 이 지도로 여행 중인 여행자 수.
- `inUse`가 false여도 **예전에 코스로 쓰였거나 방문 기록이 있는 지도는 삭제할 수 없다** (MAP-05). 앱은 삭제 요청의 409 `MAP_IN_USE`도 처리해야 한다.

#### MAP-03 내 지도 상세
`GET /maps/{mapId}` · 메이트(작성자)

```json
// 응답 200
{
  "mapId": 5,
  "title": "혼자 가기 좋은 성수 카페",
  "caption": { "original": "...", "translated": "...", "sourceLang": "ko" },
  "isPublic": false,
  "spots": [
    {
      "spotId": 31,
      "name": "카페 어니언 성수",
      "address": "서울 성동구 아차산로9길 8",
      "lat": 37.5447,
      "lng": 127.0582,
      "tagId": 12,
      "photos": ["https://..."],
      "reason": { "original": "...", "translated": "...", "sourceLang": "ko" },
      "review": { "original": "...", "translated": "...", "sourceLang": "ko" },
      "isPreview": true,
      "sortOrder": 1
    }
  ]
}
```

- 작성자가 아니면 403 `NOT_MAP_OWNER`, 지도가 없으면 404 `MAP_NOT_FOUND`.
- 스팟은 `sortOrder`(등록 순) 순서로 내려간다.

#### MAP-04 / MAP-05 지도 수정·삭제
`PATCH /maps/{mapId}` (title, caption 중 보낸 것만) → 200 · `DELETE /maps/{mapId}` → 204 · F-14

- PATCH 응답은 MAP-03(내 지도 상세)과 같은 형태다.
- 캡션을 수정하면 번역을 비우고 다시 한다.
- 지도를 지우면 그 지도의 스팟·사진도 함께 지워진다.
- **삭제할 수 없는 지도**: 한 번이라도 코스로 선택된 지도(취소·만료·완료된 매칭 포함)이거나, 스팟에 방문 기록이 있는 지도. 끝난 매칭과 방문 기록이 이 지도를 계속 가리키고 있기 때문이다.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | title을 빈 값으로 보냄, 길이 초과 |
| 403 | NOT_MAP_OWNER | 작성자가 아님 |
| 404 | MAP_NOT_FOUND | 지도가 없음 |
| 409 | MAP_IN_USE | 코스로 쓰였거나 방문 기록이 있어 삭제 불가 |
| 409 | MAP_LOCKED | 여행 중인 여행자가 있어 수정 불가 |

#### 지도 수정 잠금 (MAP-04·06, SPOT-01~03 공통)

여행자가 고른 코스와 채팅 기준(필요 인증 수)이 여행 도중에 흔들리지 않게 하려는 규칙이다. **(디자인과 확정, 6장 8번)**

| 상황 | 공개 스팟 2곳 | 나머지 스팟 | 새 스팟 추가 | 지도 이름·캡션 |
| --- | --- | --- | --- | --- |
| 여행 중인 여행자 없음 | 수정·삭제 불가 (409 `PREVIEW_SPOT_LOCKED`) | 자유 | 가능 | 수정 가능 |
| 여행 중인 여행자 있음 (`inUse`) | 수정·삭제 불가 | 수정·삭제 불가 (409 `MAP_LOCKED`) | 가능 | 수정 불가 (409 `MAP_LOCKED`) |

- 공개 스팟을 고치고 싶으면 MAP-06으로 **다른 2곳을 공개로 지정**해서 그 스팟을 일반 스팟으로 만든 뒤 고치고, 다시 공개로 지정한다 (노출 해제 → 수정 → 재게시). 여행 중인 여행자가 있으면 공개 스팟 변경(MAP-06)도 409 `MAP_LOCKED`.
- 여행 중에도 **새 스팟 추가는 허용**한다. 바꾸고 싶은 장소가 있으면 기존 스팟은 두고 새 위치를 추가하는 방식이다. 디자인의 "수정 전 장소와 수정 후 장소를 둘 다 보여 주기"를 이 방식으로 구현한다. 필요 인증 수는 코스를 고른 시점에 고정되므로 여행자의 목표는 바뀌지 않는다.
- 디자인의 다른 방법인 "아직 방문하지 않은 장소를 여행자 동의를 받고 수정"은 동의 요청·알림·수락 API가 새로 필요해서 정식 버전 계획으로 둔다.

#### MAP-06 공개 스팟 지정
`PUT /maps/{mapId}/previews` · 메이트(작성자) · F-12

```json
// 요청: 정확히 2곳. 기존 공개 스팟은 해제되고 이 2곳으로 바뀐다
{ "spotIds": [31, 34] }
// 응답 200
{ "mapId": 5, "previewSpotIds": [31, 34], "isPublic": true }
```

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | PREVIEW_COUNT_INVALID | 2곳이 아님 (1곳, 3곳 이상) |
| 400 | SPOT_NOT_IN_MAP | 이 지도의 스팟이 아님 |
| 409 | MAP_LOCKED | 여행 중인 여행자가 있음 |

#### SPOT-01 스팟 등록
`POST /maps/{mapId}/spots` · 메이트(작성자) · F-11

```json
// 요청
{
  "name": "카페 어니언 성수",
  "address": "서울 성동구 아차산로9길 8",
  "lat": 37.5447,
  "lng": 127.0582,
  "tagId": 12,
  "photoUrls": ["https://..."],
  "reason": "창가 자리에서 혼자 오래 있어도 눈치가 안 보여요",
  "review": "오전 10시 전에 가면 한적해요"
}
// 응답 201
{ "spotId": 31, "spotCount": 5, "isPublic": false }
```

- **장소 검색은 앱에서 지도 SDK로 처리**하고, 서버는 고른 결과(이름·주소·좌표)만 받는다.
- photoUrls 1~3장 (M-13), 각 URL 500자까지. reason·review 각 500자까지. reason·review는 저장할 때 번역한다.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | 이름·좌표 누락(공백만 보낸 이름 포함), 사진 4장 이상, URL 500자 초과, 글자 수 초과 |
| 400 | PHOTO_REQUIRED | 사진 0장 |
| 400 | INVALID_TAG | 없는 tagId |
| 403 | NOT_MAP_OWNER | 작성자가 아님 |
| 404 | MAP_NOT_FOUND | 지도가 없음 |

#### SPOT-02 / SPOT-03 스팟 수정·삭제
`PATCH /spots/{spotId}` (SPOT-01의 필드 중 보낸 것만) → 200 · `DELETE /spots/{spotId}` → 204 · F-14

- PATCH 응답은 MAP-03의 `spots` 항목 하나와 같은 형태다.
- `photoUrls`를 보내면 사진 전체가 그 목록으로 바뀐다. 빈 목록은 400 `PHOTO_REQUIRED`.
- reason·review를 수정하면 그 글의 번역을 비우고 다시 한다.
- 공개 스팟을 삭제하면 그 지도는 다시 공개 스팟을 지정할 때까지 `isPublic = false`가 된다.
- 수정·삭제 잠금은 위 "지도 수정 잠금" 표를 따른다. 방문 기록이 있는 스팟은 잠금과 상관없이 삭제할 수 없다 (409 `MAP_IN_USE`).

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | PHOTO_REQUIRED | 사진을 빈 목록으로 보냄 |
| 403 | NOT_MAP_OWNER | 작성자가 아님 |
| 404 | SPOT_NOT_FOUND | 스팟이 없음 |
| 409 | MAP_IN_USE | 방문 기록이 있어 삭제 불가 |
| 409 | MAP_LOCKED | 여행 중인 여행자가 있음 |
| 409 | PREVIEW_SPOT_LOCKED | 공개 스팟이라 수정·삭제 불가 (다른 곳을 공개로 바꾼 뒤 수정) |

---

### 매칭

#### MAP-07 지도 고르기
`GET /maps?sort=PINS_DESC&minPins=5&maxPins=12&page=0&size=20` · 여행자, 인증 필요 · T-11, T-11c, T-11d, T-18

카드 1장 = 지도 1개다. 카드를 누르면 공개 스팟 미리보기(MAP-08)로 가고, 거기서 고르면 바로 매칭된다(MATCH-01).

| 파라미터 | 값 | 기본값 |
| --- | --- | --- |
| sort | 생략 = 추천순 / `PINS_ASC`(핀 적은 순) / `PINS_DESC`(핀 많은 순) / `RECENT`(최근 업데이트 순) / `POPULAR`(인기순) | 추천순 |
| minPins | 핀 개수 필터 최솟값 (5 이상) | 5 |
| maxPins | 핀 개수 필터 최댓값. **생략하면 상한 없음** (슬라이더를 "20+" 끝에 두면 앱이 보내지 않는다) | 없음 |
| page, size | 0부터 시작하는 페이지, 한 번에 20개 (size 1~50) | 0, 20 |

```json
// 응답 200
{
  "items": [
    {
      "mapId": 5,
      "title": { "original": "성수 골목 카페 지도", "translated": "聖水路地裏カフェ地図", "sourceLang": "ko" },
      "mate": { "userId": "…", "nickname": "민지", "gender": "FEMALE", "ageGroup": 20, "profileImageUrl": "https://...", "bio": "..." },
      "pinCount": 7,
      "lastUpdatedAt": "2026-11-24T18:20:00+09:00",
      "selectedCount": 24,
      "myMatchId": null
    }
  ],
  "totalCount": 12,
  "emptyReason": null,
  "page": 0,
  "hasNext": false
}
```

- **목록에 나오는 지도**: 공개 조건(F-13)을 채운 지도이고, 그 메이트가 활동 중이고, 진행 중 매칭이 10건 미만이고, 차단 관계가 없고, 매칭 조건(성별·연령대 칩)을 통과한 경우. **내가 이미 고른 지도는 조건과 상관없이 나오고** `myMatchId`가 채워진다 (카드에 "選択済み").
- **값 계산**

| 값 | 계산 |
| --- | --- |
| pinCount | 이 지도의 스팟 수 |
| 핀 개수 필터 | pinCount가 minPins~maxPins 안 |
| lastUpdatedAt | 지도의 updated_at |
| selectedCount | 이 지도가 코스로 선택된 누적 횟수 (카드의 "♥ 24人が選択") |
| totalCount | 필터를 적용한 전체 지도 수. 핀 개수 시트(T-11c)에서 범위를 바꿀 때 `size=1`로 불러 이 값만 버튼에 써도 된다 |

- 추천순 = 여행자와 메이트가 겹치는 취향 수가 많은 순. 정렬 값이 같으면 겹치는 취향 수 → 최근 업데이트 → mapId 순으로 정한다 (다음 페이지에서 중복·누락이 없도록).
- `emptyReason` (items가 비었을 때만): `NO_MATE` = 매칭 조건에 맞는 메이트가 0명 → T-18 / `NO_MAP_IN_RANGE` = 메이트는 있지만 핀 개수 범위에 맞는 지도가 0개 → T-11 빈 화면 ("条件をリセット").
- 숨긴 스팟의 이름·위치는 넣지 않는다 (F-16).

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | sort 값 오류, minPins < 5, minPins > maxPins, page < 0, size가 1~50 밖 |
| 403 | NOT_VERIFIED | 여권 인증 전 |
| 409 | TRIP_REQUIRED | 진행 중인 여행 일정이 없음 |
| 409 | PREFERENCES_REQUIRED | 매칭 조건을 아직 저장하지 않음 |

#### MAP-08 공개 스팟 미리보기
`GET /maps/{mapId}/preview` · 여행자, 인증 필요 · T-11b

```json
// 응답 200
{
  "mapId": 5,
  "title": { "original": "...", "translated": "...", "sourceLang": "ko" },
  "caption": { "original": "...", "translated": "...", "sourceLang": "ko" },
  "mate": { UserSummary },
  "spotCount": 7,
  "hiddenSpotCount": 5,
  "lastUpdatedAt": "2026-11-24T18:20:00+09:00",
  "previewSpots": [
    { "spotId": 31, "name": "카페 어니언 성수", "address": "...", "lat": 37.5447, "lng": 127.0582,
      "photos": ["https://..."], "reason": { ... }, "review": { ... } }
  ],
  "myMatchId": null,
  "slots": { "total": 5, "used": 2 }
}
```

- **숨긴 스팟은 개수(`hiddenSpotCount`)만 준다.** 이름·사진·좌표는 응답에 넣지 않는다. 앱의 회색 자물쇠 핀은 실제 위치가 아닌 장식용 위치에 그린다.
- `myMatchId`가 있으면 이미 고른 지도다. 앱은 "この地図をやめる"를 보여 주고, 누르면 MATCH-07을 부른다.
- `slots.used`가 total과 같으면 앱은 "枠がいっぱいです（5 / 5）"로 선택 버튼을 막는다.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | MAP_NOT_AVAILABLE | 비공개 지도, 또는 메이트가 목록 조건을 통과하지 못함 (내가 이미 고른 지도는 예외) |
| 404 | MAP_NOT_FOUND | 지도가 없음 |

#### MATCH-01 지도 선택 (매칭 + 코스 확정)
`POST /matches` · 여행자, 인증 필요 · T-11b

```json
// 요청 (여행은 진행 중인 일정으로 자동 지정)
{ "mapId": 5 }
// 응답 201
{
  "matchId": 101,
  "status": "ON_COURSE",
  "chatStatus": "LOCKED",
  "mate": { UserSummary },
  "courseMap": { "mapId": 5, "title": { "original": "...", "translated": "...", "sourceLang": "ko" } },
  "progress": { "visited": 0, "required": 3, "total": 7 },
  "matchedAt": "2026-11-29T10:02:00+09:00",
  "slots": { "total": 5, "used": 1 }
}
```

- **지도를 고르는 순간 매칭과 코스가 함께 확정된다.** 메이트 수락 단계와 별도의 코스 선택 단계는 없다. 상태는 바로 `ON_COURSE`.
- 지도 1개 = 칸 1개. 최대 5개까지 고를 수 있고, **같은 메이트의 다른 지도도 고를 수 있다** (지도마다 매칭 1개).
- **필요 인증 수를 이때 계산해 저장한다**: `required_visits = floor(코스 스팟 수 × 0.5)` (5곳 → 2, 6곳 → 3, 7곳 → 3). 여행 중에 스팟이 추가돼도 바뀌지 않는다.
- 서버는 지도가 지금도 MAP-07의 목록 조건을 통과하는지 다시 확인한다. 앱이 보낸 mapId만 믿지 않는다.
- **칸 확인, 메이트 정원(10건) 확인, 매칭 생성, 코스 확정은 하나의 트랜잭션**이다. 중간에 실패하면 아무것도 저장되지 않아서 칸만 쓰인 상태가 남지 않는다. 네트워크 오류로 다시 보냈는데 이미 만들어졌으면 409 `MAP_ALREADY_SELECTED`가 오므로, 앱은 MATCH-02로 새로고침하면 된다.
- 메이트에게 MATCHED 알림을 보낸다 (M-21).

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | MAP_NOT_AVAILABLE | 비공개 지도, 또는 메이트가 목록 조건을 통과하지 못함 (매칭 조건 불일치, 차단, 탈퇴) |
| 404 | MAP_NOT_FOUND | 지도가 없음 |
| 409 | NO_FREE_SLOT | 빈 칸이 없음 (5 / 5) |
| 409 | MATE_FULL | 메이트 정원 10건이 찼음 |
| 409 | MAP_ALREADY_SELECTED | 이 지도로 이미 진행 중인 매칭이 있음 |
| 409 | TRIP_REQUIRED | 진행 중인 여행 일정이 없음 |

#### MATCH-02 내 매칭 목록
`GET /matches?state=active|ended` · 로그인 · F-UI-07, F-UI-15, F-UI-17

- `active` = ON_COURSE, `ended` = COMPLETED·CANCELED·EXPIRED·BLOCKED. 생략하면 전체. (v1.7부터 매칭은 처음부터 ON_COURSE라 MATCHED 상태는 쓰지 않는다)
- 메이트는 `mapId`를 붙여 **그 지도를 고른 여행자만** 볼 수 있다: `GET /matches?mapId=5` → 지도별 대화 목록(M-15). 채팅이 LOCKED인 항목은 잠금 아이콘과 진행률("2 / 7 인증 · 3곳 인증하면 대화가 열려요")을, 여행이 끝난 항목은 앨범 이동을 보여 준다.
- 여행자에게는 상대 = 메이트, 메이트에게는 상대 = 여행자.

```json
// 응답 200
[
  {
    "matchId": 101,
    "status": "ON_COURSE",
    "chatStatus": "LOCKED",
    "partner": { "userId": 7, "nickname": "서울토박이", ... },
    "courseMap": { "mapId": 5, "title": "혼자 가기 좋은 성수 카페" },
    "progress": { "visited": 1, "required": 2, "total": 5 },
    "trip": { "startDate": "2026-11-28", "endDate": "2026-12-01" },
    "lastVisitAt": "2026-11-29T14:03:00+09:00"
  }
]
```

- **progress**: `visited` = 인증한 곳 수, `required` = 채팅에 필요한 인증 수, `total` = 코스 지도 스팟 수. 앱은 "1 / 5곳 인증 · 채팅까지 1곳"처럼 보여 준다.
- 메이트 화면은 `lastVisitAt`이 최근인 순서로 정렬해 새 인증이 맨 위에 오게 한다 (M-20 최근 방문).
- `courseMap.title`은 여행자에게는 LocalizedText, 메이트에게는 한국어 문자열이다.
- `chatStatus`: `LOCKED`(필요 인증 수 미만) / `READY`(필요 인증 수 달성, 여행자가 열 수 있음) / `OPEN`.

#### MATCH-03 매칭 상세
`GET /matches/{matchId}` · 당사자 · F-25, F-29

MATCH-02의 항목 하나와 같은 형태에 아래가 추가된다.

```json
{
  "chat": { "status": "READY", "canOpen": true },
  "matchedAt": "...", "courseSelectedAt": "...", "endedAt": null,
  "albumId": null,
  "feedbackAvailable": false
}
```

- `chat.canOpen`: 내가 여행자이고 chatStatus가 READY면 true. 앱은 T-20의 "チャットする"를 검정 활성으로 바꾼다 (메이트는 항상 false).
- `courseSelectedAt`은 matchedAt과 같다 (지도를 고르는 순간 코스 확정).
- **차단당한 쪽에게는 status를 `BLOCKED` 대신 `ENDED`로 내려준다** (MATCH-02도 같음). 앱은 "매칭이 종료되었습니다"라고만 표시하고 차단 사실은 드러내지 않는다.
- `feedbackAvailable`: 차단당한 쪽이고 아직 피드백(BLOCK-03)을 남기지 않았으면 true. 앱은 "의견 남기기" 버튼을 보여 준다.

> v1.7에서 MATCH-04(메이트 지도 목록)와 MATCH-05(코스 지도 선택)는 삭제했다. 매칭 전에 지도를 고르는 흐름이 되어 MAP-07·MAP-08·MATCH-01이 대신한다.

#### MATCH-06 코스 지도
`GET /matches/{matchId}/course` · 당사자 · F-25

```json
// 응답 200
{
  "map": { "mapId": 5, "title": { ... }, "caption": { ... } },
  "progress": { "visited": 1, "required": 2, "total": 5 },
  "spots": [
    { "spotId": 31, "name": "...", "address": "...", "lat": 37.5447, "lng": 127.0582,
      "photos": ["..."], "reason": { ... }, "review": { ... },
      "visited": true, "visitId": 801 }
  ]
}
```

- `visited: true`인 스팟에 스탬프를 찍는다. 필요 인증 수를 채운 뒤에도 나머지 스팟을 계속 인증할 수 있고, visited는 그대로 늘어난다.

#### MATCH-07 매칭 끊기
`POST /matches/{matchId}/cancel` · 당사자(여행자·메이트) · T-92, T-93, M-93, T-11b("この地図をやめる")

```json
// 요청 (모두 생략 가능)
{ "reason": "PLAN_CHANGED", "detail": "..." }
// 응답 200 (여행자에게만 slots)
{ "matchId": 101, "status": "CANCELED", "slots": { "total": 5, "used": 0 } }
```

- **여행자와 메이트 모두** 끊을 수 있다. 사유는 선택 사항이다.
- reason: `FEW_SPOTS`(行きたいスポットが少なかった) / `PLAN_CHANGED`(旅行の予定が変わった) / `NOT_A_MATCH`(メイトと合わなかった・話が合わなかった) / `NO_REPLY`(返信が来ない · 답장이 오지 않아요) / `UNCOMFORTABLE`(대화가 불편했어요) / `CANNOT_HELP`(더 이상 도와주기 어려워요) / `OTHER`(その他 · 기타)
- 여행자 칸은 바로 반환된다. 끊은 뒤 바로 다른 지도를 고를 수 있다.
- 상대에게 CANCELED 알림 ("매칭이 종료되었습니다"). 사유는 상대에게 보여 주지 않는다.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | 없는 reason, detail 300자 초과 |
| 409 | MATCH_NOT_ACTIVE | 이미 끝난 매칭 |

#### MATCH-08 여행 완료
`POST /matches/{matchId}/complete` · 여행자(당사자) · F-32, F-33

```json
// 요청 (둘 다 생략 가능. 생략하면 제목 = 지도 이름, 표지 = 첫 인증 사진)
{ "albumTitle": "はじめてのソウルカフェ旅", "coverUrl": "https://..." }
// 응답 200
{ "matchId": 101, "status": "COMPLETED", "albumId": 55, "slots": { "total": 5, "used": 0 } }
```

- 상태 COMPLETED, 칸 반환, 앨범 1개 생성, 메이트에게 COMPLETED 알림.
- 여행자가 이 버튼을 누르지 않아도, 인증 50% 이상이면 종료일이 지난 뒤 배치가 같은 처리를 한다 (자동 완료, 아래 서버 배치 참고).

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 409 | MATCH_NOT_ON_COURSE | 코스 선택 전이거나 이미 끝난 매칭 |

---

### 탐방 · 채팅 · 여행 완료

#### VISIT-01 방문 인증
`POST /matches/{matchId}/visits` · 여행자(당사자) · F-26, F-27, F-29

```json
// 요청
{
  "spotId": 31,
  "photoUrl": "https://...",
  "review": "窓際の席が本当に落ち着きました",
  "lat": 37.5449,
  "lng": 127.0580
}
// 응답 201
{
  "visitId": 801,
  "spotId": 31,
  "verifiedAt": "2026-11-29T14:03:00+09:00",
  "progress": { "visited": 2, "required": 2, "total": 5 },
  "chatReady": true
}
```

처리 순서:
1. 요청의 lat·lng와 스팟 좌표의 거리를 계산한다. 200m 안이면 통과 (`DEMO_MODE=true`면 건너뜀).
2. **lat·lng는 거리 계산에만 쓰고 저장하지 않는다.** DB에는 사진·후기·인증 시각만 남는다.
3. 후기를 한국어로 번역해 저장한다.
4. 메이트에게 VISIT 알림 (인증 즉시 공개, F-27).
5. 이번 인증으로 인증 수가 `required_visits`에 처음 도달하면 `chat_status = READY`로 바꾸고 여행자에게 CHAT_READY 알림. 응답의 `chatReady`가 true면 앱은 인증 완료(T-25) 다음에 채팅 열기(T-27)를 띄운다.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | LOCATION_REQUIRED | lat·lng 없음 (위치 권한 거부). 앱은 "위치 권한이 필요합니다" 안내 |
| 400 | OUT_OF_RANGE | 반경 200m 밖. 앱은 "스팟 근처에서 다시 시도해 주세요" 안내 |
| 400 | SPOT_NOT_IN_COURSE | 코스 지도의 스팟이 아님 |
| 400 | VALIDATION_ERROR | 사진·후기 누락, 후기 500자 초과 |
| 403 | ROLE_FORBIDDEN | 메이트가 호출 |
| 403 | NOT_MATCH_MEMBER | 이 매칭의 여행자가 아님 |
| 409 | ALREADY_VISITED | 이미 인증한 스팟 |
| 409 | MATCH_NOT_ON_COURSE | 끝난 매칭 |

#### VISIT-02 방문 기록 목록
`GET /matches/{matchId}/visits` · 당사자 · F-27, F-UI-17

```json
// 응답 200 (최근 인증 순)
[
  {
    "visitId": 801,
    "spot": { "spotId": 31, "name": "카페 어니언 성수" },
    "photoUrl": "https://...",
    "review": { "original": "窓際の席が...", "translated": "창가 자리가 정말...", "sourceLang": "ja" },
    "verifiedAt": "2026-11-29T14:03:00+09:00",
    "reaction": "LIKE",
    "comments": [
      { "commentId": 9001, "content": { "original": "거기 창가 최고죠!", "translated": "...", "sourceLang": "ko" }, "createdAt": "..." }
    ]
  }
]
```

- 위치 정보는 어떤 형태로도 내려주지 않는다.
- `reaction`: 메이트가 누른 리액션 (`LIKE` 좋아요 / `LAUGH` 웃음 / `CHEER` 응원) 또는 `null`. 방문 기록 하나에 하나만.
- `comments`: 메이트 댓글, 쓴 순서대로.
- 당사자가 아니면 403 `NOT_MATCH_MEMBER`.

#### VISIT-03 / VISIT-04 리액션 누르기·바꾸기·해제
`PUT /visits/{visitId}/reaction` · `DELETE /visits/{visitId}/reaction` → 204 · 메이트(당사자) · M-23

```json
// PUT 요청
{ "type": "LIKE" }
// PUT 응답 200
{ "visitId": 801, "reaction": "LIKE" }
```

- 방문 기록 하나에 리액션은 하나다. 다른 종류로 PUT하면 **바뀌고**, DELETE하면 **해제**된다. 앱은 같은 리액션을 다시 누르면 DELETE를 부른다.
- 여행자에게 REACTION 알림은 **처음 누를 때만** 보낸다 (바꾸기·해제는 알리지 않음).
- 이미 해제된 상태에서 DELETE해도 204.

#### VISIT-05 댓글
`POST /visits/{visitId}/comments` · 메이트(당사자) · M-23

```json
// 요청
{ "content": "거기 창가 최고죠!" }
// 응답 201
{ "commentId": 9001 }
```

- 댓글은 일본어로 번역해 저장하고, 여행자에게 REACTION 알림.
- 신고(REPORT-01)의 `COMMENT` 대상 id는 이 commentId다.

| 상태 | 코드 | 상황 (VISIT-03~05 공통) |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | 없는 type, 댓글이 비어 있음·300자 초과 |
| 403 | ROLE_FORBIDDEN | 여행자가 호출 |
| 403 | NOT_MATCH_MEMBER | 이 매칭의 메이트가 아님 |
| 404 | VISIT_NOT_FOUND | 방문 기록이 없음 |
| 409 | MATCH_NOT_ACTIVE | 차단된 매칭, 또는 여행 완료 뒤 어느 한쪽이 차단함 |

#### CHAT-01 채팅 열기
`POST /matches/{matchId}/chat/open` · 여행자(당사자) · T-27

```json
// 응답 200
{ "matchId": 101, "chatStatus": "OPEN" }
```

- 인증 수가 필요 인증 수에 닿아 `READY`가 되면 **여행자가 누르는 순간 바로 열린다.** 메이트 수락 단계는 없다.
- 메이트에게 CHAT_OPEN 알림 (M-30).

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 403 | ROLE_FORBIDDEN | 메이트가 호출 |
| 409 | CHAT_NOT_READY | 아직 필요 인증 수 미만 (LOCKED) |
| 409 | CHAT_ALREADY_OPEN | 이미 열림 |
| 409 | MATCH_NOT_ACTIVE | 취소·차단·만료된 매칭 |

#### CHAT-02 쪽지 목록
`GET /matches/{matchId}/messages?after={messageId}&size=50` · 당사자 · F-31

```json
// 응답 200 (오래된 순)
[
  { "messageId": 1201, "senderId": 7, "mine": false,
    "content": { "original": "성수 어땠어요?", "translated": "聖水はどうでしたか？", "sourceLang": "ko" },
    "createdAt": "...", "readAt": null }
]
```

- 쪽지 형태라 실시간 연결(WebSocket)은 쓰지 않는다. **채팅 화면이 열려 있는 동안 5~10초마다 `after=마지막 messageId`로 새 쪽지만 가져온다.**
- 호출하면 상대가 보낸 쪽지의 `read_at`을 채운다.
- 채팅이 OPEN이 아니면 409 `CHAT_NOT_OPEN`.

#### CHAT-03 쪽지 보내기
`POST /matches/{matchId}/messages` · 당사자 · F-31, F-35

```json
// 요청
{ "content": "すごく良かったです！" }
// 응답 201: CHAT-02의 항목 하나
```

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | 빈 내용, 500자 초과 |
| 409 | CHAT_NOT_OPEN | 채팅이 열리기 전, 또는 차단·취소된 매칭 |

#### ALBUM-01 앨범 보기
`GET /matches/{matchId}/album` · 당사자 · F-33

```json
// 응답 200
{
  "albumId": 55,
  "title": "はじめてのソウルカフェ旅",
  "coverUrl": "https://...",
  "createdAt": "...",
  "traveler": { UserSummary },
  "mate": { UserSummary },
  "map": { "mapId": 5, "title": { ... } },
  "items": [ VISIT-02의 항목과 같은 형태 ]
}
```

- 앨범 내용은 따로 저장하지 않고 방문 기록과 리액션을 모아서 보여 준다.
- 여행 완료(MATCH-08, 자동 완료)와 **기간 만료 자동 종료(T-91)** 때 앨범이 만들어진다. 앨범이 없으면 404 `ALBUM_NOT_FOUND`.
- `items`는 VISIT-02의 항목과 같은 형태다 (reaction, comments 포함).
- 차단된 뒤에도 앨범은 그대로 볼 수 있다.

#### ALBUM-02 앨범 수정
`PATCH /matches/{matchId}/album` · 여행자(당사자) · `title`, `coverUrl` 중 보낸 것만 수정 → 200, 응답은 ALBUM-01과 같은 형태

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | 빈 값으로 보냄, title 100자 초과 |
| 403 | ROLE_FORBIDDEN | 메이트가 호출 |
| 404 | ALBUM_NOT_FOUND | 앨범이 없음 |

#### REVIEW-01 / REVIEW-02 상호 후기
`POST /matches/{matchId}/reviews`, `GET /matches/{matchId}/reviews` · 당사자 · F-34

```json
// POST 요청 (받는 사람은 서버가 매칭 상대로 자동 지정, content는 생략 가능)
{ "rating": 5, "content": "おかげで最高の旅になりました" }
// POST 응답 201
{ "reviewId": 12 }
// GET 응답 200 (작성 순)
[ { "reviewId": 12, "reviewer": { UserSummary }, "rating": 5,
    "content": { "original": "おかげで最高の旅になりました", "translated": null, "sourceLang": "ja" },
    "createdAt": "..." } ]
```

- 여행 완료(COMPLETED)와 기간 만료(EXPIRED, T-91 → 앨범 → 후기) 뒤에 쓸 수 있다.
- **후기는 아직 번역하지 않는다.** `reviews` 테이블에 번역 칸이 없어서 `translated`는 항상 `null`이다 (6장 7번). 앱은 원문을 보여 준다.
- content를 생략하면 `content`는 `null`.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | rating이 1~5 아님, 내용 300자 초과 |
| 403 | NOT_MATCH_MEMBER | 당사자가 아님 |
| 409 | MATCH_NOT_COMPLETED | 여행이 끝나지 않음 (완료·기간 만료가 아님. 취소·차단된 매칭 포함) |
| 409 | MATCH_NOT_ACTIVE | 여행 완료 뒤 어느 한쪽이 차단함 |
| 409 | ALREADY_REVIEWED | 이미 작성함 |

---

### 안전 · 알림

#### REPORT-01 신고
`POST /reports` · 당사자 · F-36

```json
// 요청
{
  "matchId": 101,
  "targetType": "CHAT",
  "targetId": 1201,
  "reason": "CONTACT_REQUEST",
  "detail": "LINE ID를 계속 물어봅니다"
}
// 응답 201
{ "reportId": 3 }
```

- 신고 대상자는 **서버가 매칭 상대로 정한다** (앱이 보낸 사용자 id를 믿지 않는다). 그래서 본인 신고는 구조적으로 불가능하다.
- targetType: `PROFILE`(targetId 생략. 대상은 매칭 상대) / `VISIT`(visitId) / `COMMENT`(commentId, VISIT-05) / `CHAT`(messageId)
- reason (C-06, 6개 중 1개 필수): `ABUSIVE`(불쾌한 언행·욕설) / `CONTACT_REQUEST`(연락처나 개인정보를 계속 물어봐요) / `FORCED_MEETING`(만남을 강요해요) / `SEXUAL`(성적인 발언·제안) / `SPAM`(스팸·홍보·영업) / `OTHER`(기타, detail 필수)
- 매칭 상태와 상관없이 (끝난 매칭이어도) 신고할 수 있다.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | INVALID_TARGET | 대상이 이 매칭의 상대가 쓴 것이 아님 (내 글을 신고) |
| 400 | DETAIL_REQUIRED | reason이 OTHER인데 detail이 비어 있음 |
| 409 | ALREADY_REPORTED | 같은 매칭에서 같은 상대를 이미 신고함 |

#### BLOCK-01 차단
`POST /matches/{matchId}/block` · 당사자 · F-37

```json
// 요청 (reason 필수)
{ "reason": "CONTACT_REQUEST", "detail": "LINE ID를 계속 물어봅니다" }
// 응답 200
{ "matchId": 101, "status": "BLOCKED" }
```

- **채팅 여부와 상관없이 언제든** 차단할 수 있다. 여행자·메이트 모두 가능. 메이트에게는 매칭 취소 버튼이 없으므로, 원치 않는 매칭을 끝내는 수단이기도 하다.
- reason: 신고와 같은 목록 `ABUSIVE` / `SEXUAL` / `CONTACT_REQUEST` / `SPAM` / `OTHER`(detail 필수)
- 진행 중인 매칭(ON_COURSE)이면 BLOCKED로 바꾸고 여행자 칸을 반환한다. 이미 끝난 매칭이면 차단만 저장한다(이후 목록에서 서로 제외).
- 차단당한 쪽에는 CANCELED 알림을 "매칭이 종료되었습니다" 문구로 보낸다. **차단 사실은 밝히지 않는다.**
- 부당한 차단에 대한 판단과 불이익은 MVP에서 구현하지 않는다 (F-OPT-10). 사유와 피드백(BLOCK-03)은 그 판단의 근거로 저장해 둔다.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | reason 누락, OTHER인데 detail 없음 |
| 409 | ALREADY_BLOCKED | 이미 차단함 |

#### BLOCK-02 내 차단 목록
`GET /users/me/blocks` · 로그인 → `[ { "user": { UserSummary }, "blockedAt": "..." } ]`
(차단 해제는 요구사항에 없어서 MVP에서 만들지 않는다.)

#### BLOCK-03 차단 피드백
`POST /matches/{matchId}/block-feedback` · 차단당한 당사자 · F-44

```json
// 요청
{ "content": "갑자기 매칭이 끝나서 당황했어요. 저는 일정만 물어봤습니다." }
// 응답 201
{ "matchId": 101, "feedbackAt": "2026-11-29T15:10:00+09:00" }
```

- 매칭 1건당 1회. BLOCKS.feedback에 저장한다. 1~500자.

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 403 | NOT_BLOCKED_PARTY | 이 매칭에서 차단당한 사람이 아님 |
| 409 | FEEDBACK_ALREADY_SUBMITTED | 이미 작성함 |

#### NOTI-01 ~ NOTI-04 알림
`GET /notifications?cursor={notificationId}&size=20` · 로그인 · F-39

```json
// 응답 200 (최신 순)
{
  "items": [
    { "notificationId": 77, "type": "VISIT", "matchId": 101,
      "message": "ゆきさんが「카페 어니언 성수」を訪問しました", "isRead": false, "createdAt": "..." }
  ],
  "nextCursor": 58
}
```

- 알림 문구는 **받는 사람의 언어로** 서버가 만들어 저장한다 (번역 API가 아니라 정해진 문장 틀 사용).
- `matchId`(ERD의 ref_id)를 보고 앱이 이동할 화면을 정한다.

| type | 받는 사람 | 누르면 이동 |
| --- | --- | --- |
| MATCHED | 메이트 (여행자가 지도를 고름) | 매칭 알림 시트(M-21) → 여행자 상세 |
| CANCELED | 상대 (매칭 끊기·탈퇴·차단, 문구는 "매칭이 종료되었습니다") | 홈 |
| VISIT | 메이트 | 방문 기록 |
| REACTION | 여행자 | 방문 기록 |
| CHAT_READY | 여행자 | 채팅 열기(T-27) |
| CHAT_OPEN | 메이트 | 채팅 열림 시트(M-30) → 채팅 |
| EXPIRED | 양쪽 | 기간 만료 화면(T-91) → 앨범 |
| COMPLETED | 메이트 (자동 완료는 양쪽) | 앨범 |

- NOTI-02 `GET /notifications/unread-count` → `{ "count": 3 }`
- NOTI-03 `PATCH /notifications/{id}/read` → 204
- NOTI-04 `PATCH /notifications/read-all` → 204
- 푸시 알림(F-OPT-03)이 없으므로 앱은 **홈 화면에 들어올 때와 앱이 다시 앞으로 올 때** unread-count를 부른다.

---

### 서버 배치 (API 아님)

| 이름 | 주기 | 내용 | 요구사항 |
| --- | --- | --- | --- |
| 자동 종료 | 매일 00:10 (서울) | 여행 종료일이 지났고, ON_COURSE이고, 인증 수가 required_visits(코스 스팟의 50% 내림) 미만인 매칭 → EXPIRED, 칸 반환, **앨범 생성**(T-91 → T-31), 양쪽에 EXPIRED 알림 | F-24 |
| 자동 완료 | 같은 배치 | 여행 종료일이 지났고, ON_COURSE이고, 인증 수가 required_visits 이상인데 여행 완료(MATCH-08)를 누르지 않은 매칭 → COMPLETED, 칸 반환, 앨범 자동 생성(제목 = 지도 이름, 표지 = 첫 인증 사진), 양쪽에 COMPLETED 알림. 이후 상호 후기(REVIEW-01) 작성 가능 | F-24, F-32, F-33 |

- 시연에서는 DEV-01로 바로 실행해서 보여 줄 수 있다.

---

## 3. 화면별 호출 API

화면 ID는 화면 명세 v9와 같습니다. 프론트엔드는 이 표를 보고 화면마다 어떤 API를 붙일지 확인하면 됩니다.

### 여행자 (T-)

| 화면 | 들어올 때 | 버튼·동작 |
| --- | --- | --- |
| T-01 국적 선택 | – | (선택값을 들고 가입 화면으로) |
| T-02 가입·로그인 | – | Supabase 가입·로그인 → AUTH-01(가입 직후 1회) → USER-01 |
| T-03 여권 인증 | – | USER-02 |
| T-04 프로필 등록 | – | UPLOAD-01 → USER-03 |
| T-05 / T-05a 여행 취향 | TAG-01 | TAG-02 |
| T-06 매칭 조건 | PREF-01 | PREF-02 |
| T-07 여행 일정 | TRIP-02 | TRIP-01 / TRIP-03 |
| T-10 홈 · 여행 전 | USER-01, MATCH-02(active), NOTI-02 | – |
| T-11 / T-11c / T-11d 지도 고르기 | MAP-07 (정렬·필터를 바꿀 때, 아래로 스크롤할 때 다시 호출) | – |
| T-18 조건에 맞는 메이트 없음 | (MAP-07의 `emptyReason = NO_MATE`) | – |
| T-11b 공개 스팟 미리보기 | MAP-08 | MATCH-01 ("この地図を選ぶ") / MATCH-07 ("この地図をやめる") |
| T-20 홈 · 여행 중 | USER-01, MATCH-02(active), NOTI-02 | CHAT-01 ("チャットする" 활성일 때) |
| T-21 코스 지도 · 스팟 목록 | MATCH-03, MATCH-06 | MATCH-08, MATCH-07 (하단 회색 밑줄 → T-92) |
| T-22 스팟 상세 | (MATCH-06 데이터) | – |
| T-23 / T-24 / T-19 / T-25 방문 인증 | – | UPLOAD-01 → VISIT-01 (실패 코드로 T-19 2종 구분) |
| T-26 내 방문 기록 | VISIT-02 | – |
| T-27 채팅 열기 | MATCH-03 | CHAT-01 |
| T-28 쪽지 대화 | MATCH-03, CHAT-02(반복) | CHAT-03 |
| T-30 여행 완료 | – | MATCH-08 |
| T-31 앨범 | ALBUM-01 | ALBUM-02 |
| T-32 메이트 상호 후기 | REVIEW-02 | REVIEW-01 |
| T-91 기간 만료 | MATCH-03 | (앨범으로 → T-31) |
| T-92 / T-93 매칭 끊기 | – | MATCH-07 |

### 메이트 (M-)

| 화면 | 들어올 때 | 버튼·동작 |
| --- | --- | --- |
| M-02 가입 · 본인 인증 | – | Supabase 가입·로그인 → AUTH-01 → USER-02 |
| M-03 프로필 등록 | – | UPLOAD-01 → USER-03 |
| M-04 추천 가능 취향 · 동네 | TAG-01 | TAG-02 |
| M-10 내 지도 목록 | MAP-02 | – |
| M-10a 내 지도 상세 | MAP-03 | (`inUse`면 수정 버튼 숨김) |
| M-11 지도 이름 · 캡션 | – | MAP-01 / MAP-04 |
| M-12 / M-13 스팟 등록 · 정보 | MAP-03 | UPLOAD-01 → SPOT-01, SPOT-02, SPOT-03 |
| M-14 공개 스팟 2곳 지정 | MAP-03 | MAP-06 |
| M-15 지도별 대화 목록 | MATCH-02 (`?mapId=`) | – |
| M-20 홈 | USER-01, MATCH-02(active), NOTI-02 | – |
| M-21 매칭 알림 (시트) | (MATCHED 알림) | – |
| M-22 여행자 상세 | MATCH-03, MATCH-06 (인증한 스팟만 표시) | MATCH-07, REPORT-01 |
| M-23 방문 기록 · 리액션 | VISIT-02 | VISIT-03, VISIT-04, VISIT-05, REPORT-01 |
| M-30 채팅 열림 알림 (시트) | (CHAT_OPEN 알림) | – |
| M-31 쪽지 대화 | MATCH-03, CHAT-02(반복) | CHAT-03 |
| M-40 앨범 보기 | ALBUM-01 | – |
| M-41 여행자 상호 후기 | REVIEW-02 | REVIEW-01 |
| M-93 매칭 끊기 | – | MATCH-07 |

### 공통 (C-)

| 화면 | 들어올 때 | 버튼·동작 |
| --- | --- | --- |
| C-01 알림 목록 | NOTI-01 | NOTI-03, NOTI-04 |
| C-02 마이페이지 | USER-01, USER-06 | USER-04, TAG-02, PREF-02, TRIP-03, USER-05, (로그아웃 = `supabase.auth.signOut()`) |
| C-03 / C-04 / C-06 점 3개 메뉴 · 차단 · 신고 | – | BLOCK-01 (채팅에서만), MATCH-07, REPORT-01 |
| C-05 AI 코스 추천 | (화면만, OPT-01) | – |
| 차단당한 쪽 의견 남기기 | MATCH-03 (`feedbackAvailable`) | BLOCK-03 |

---

## 4. 시연 흐름에서 호출되는 순서

발표에서 보여 줄 한 번의 여행이 이 순서로 API를 부릅니다. **P0 API가 이 흐름을 끝까지 돌 수 있으면 시연 준비 완료**입니다.

| 순서 | 누가 | 동작 | API |
| --- | --- | --- | --- |
| 1 | 메이트 | 가입 → 본인 인증 → 프로필 → 취향 | Supabase 가입, AUTH-01, USER-02, USER-03, TAG-02 |
| 2 | 메이트 | 지도 만들고 스팟 5곳 등록, 공개 스팟 2곳 지정 | MAP-01, UPLOAD-01, SPOT-01 ×5, MAP-06 |
| 3 | 여행자 | 가입 → 여권 인증 → 프로필 → 취향 → 매칭 조건 → 일정 | Supabase 가입, AUTH-01, USER-02, USER-03, TAG-02, PREF-02, TRIP-01 |
| 4 | 여행자 | 지도 고르기 → 공개 스팟 미리보기 → 이 지도 선택 (= 매칭) | MAP-07, MAP-08, MATCH-01 |
| 5 | 메이트 | 매칭 알림 → 여행자 상세 | NOTI-01, MATCH-03 |
| 6 | 여행자 | 스팟에서 인증 (5곳 지도라면 2곳) | MATCH-06, UPLOAD-01, VISIT-01 |
| 7 | 메이트 | 알림 → 방문 기록 → 리액션·댓글 | NOTI-01, VISIT-02, VISIT-03, VISIT-05 |
| 8 | 여행자 | 50% 달성 → 채팅 열기 → 쪽지 (AI 번역) | CHAT-01, CHAT-03, CHAT-02 |
| 9 | 여행자 | 여행 완료 → 앨범 | MATCH-08, ALBUM-01 |
| 10 | 양쪽 | 상호 후기 | REVIEW-01 |

---

## 5. 선택 기능 API (시간이 되면)

#### OPT-01 AI 코스 추천 (F-OPT-01)
`POST /ai/course-recommendations` · 여행자

```json
// 요청
{ "theme": "ひとりご飯しやすいコース", "area": "明洞" }
// 응답 200
{
  "title": "...",
  "summary": "...",
  "spots": [ { "order": 1, "spotId": 31, "name": "...", "reason": "..." } ]
}
```

- 서버가 후보 스팟 목록을 LLM에 넘기고, **JSON 형식으로만 답하게** 해서 받는다. LLM이 목록에 없는 스팟을 지어내지 않도록, 응답의 spotId가 후보에 있는지 서버에서 다시 확인한다.
- 후보 스팟 범위는 아래 "확인이 필요한 것" 4번을 먼저 정해야 한다.

#### OPT-02 AI 매칭 이유 한 줄 (F-OPT-02)
API를 새로 만들지 않고 MAP-07 카드에 `matchReason`을 추가해 채운다. 목록 전체에 LLM을 부르면 느리고 비싸므로, 화면에 보이는 카드만 생성하고 (여행자, 메이트) 쌍으로 저장해 다시 쓴다. 구현하게 되면 저장용 테이블을 ERD에 추가한다.

---

## 6. 확인이 필요한 것

명세를 쓰다가 요구사항에 정해져 있지 않은 부분이 나왔습니다. 일단 제안안으로 적어 두었고, 팀에서 다르게 정하면 고치겠습니다.

| # | 질문 | 제안안 (명세에 반영된 내용) |
| --- | --- | --- |
| 1 | 채팅 열기를 거절한 뒤 다시 수락할 수 있나? | **v1.7에서 없어짐**: 여행자가 열면 바로 열리고 수락 단계가 없다 |
| 2 | 여행 완료 후에도 채팅을 계속할 수 있나? | 가능. 차단·취소되지 않았으면 계속 쪽지를 주고받을 수 있다 |
| 3 | 자동 종료(EXPIRED)된 매칭도 앨범을 만들 수 있나? | **확정 (화면 명세 v9)**: 자동 종료 배치가 앨범을 만든다 (T-91 → T-31) |
| 4 | AI 코스 추천에 어떤 스팟을 쓰나? | **비밀지도의 숨겨진 스팟을 쓰면 '비밀'이 깨진다.** 공개 스팟(각 지도의 2곳)만 후보로 쓰는 것을 제안 |
| 5 | 지도 SDK는 무엇을 쓰나? | **확정**: 네이버 지도 + 장소 검색 API |
| 6 | 매칭 조건을 바꾸면 목록이 바로 바뀌나? | **확정**: 바로 바뀐다 (하루 1회 규칙이 없어짐) |
| 7 | 상호 후기도 번역하나? | 지금은 원문만 내려간다. 번역하려면 `reviews.content_translated` 컬럼을 마이그레이션으로 추가해야 한다 (서버 A와 결정 필요) |
| 8 | 지도 수정 잠금 범위 | **확정**: 여행 중인 여행자가 없으면 공개 스팟만 잠금(노출 해제 → 수정 → 재공개), 있으면 기존 스팟·지도 이름 잠금 + 새 스팟 추가만 허용(수정 전·후 장소가 둘 다 보임). 여행자 동의를 받고 수정하는 기능은 정식 버전 (MAP-06 위 표) |
| 9 | 숨긴 스팟을 미리보기에서 어떻게 보여 주나? | **확정**: 서버는 개수만 준다. 자물쇠 핀은 장식용 위치에 그린다 (MAP-08) |
| 10 | 별점을 다음 추천에 반영하나? (T-32 안내 문구) | **MVP에서는 반영 안 함.** 인기순은 지도가 선택된 횟수 기준. 화면 문구 조정 필요 |
| 11 | 푸시 알림 (화면 명세 "외부 연동") | MVP는 앱 안 알림 목록(NOTI)만. 푸시는 F-OPT-03으로 시간이 되면 |

---

## 7. ERD에 반영한 변경 (v2 → v2.6)

| 변경 | 이유 |
| --- | --- |
| MATCHES.traveler_chat_ok, mate_chat_ok를 **null 허용**으로 변경 | null = 아직 응답 안 함, true = 수락, false = 거절을 구분하기 위해 |
| USERS.terms_agreed_at 추가 | 약관 동의 시각 기록 (F-02) |
| NOTIFICATIONS.ref_id 의미를 **match_id로 통일** | 모든 알림이 매칭 단위라서, 앱이 이동할 화면을 type + match_id로 정할 수 있음 |
| 자동 종료 계산 조건 수정 | ERD v2 설명의 "채팅 미개설"을 요구사항(F-24)대로 "인증 수 미달"로 바로잡음 |
| MATCHES.required_visits 추가 (v2.2) | 채팅 기준을 50%로 바꾸면서, 코스 선택 시 필요 인증 수를 계산해 저장 |
| RECOMMENDATIONS 삭제 (v2.3) | 하루 3명 저장이 필요 없어짐. 지도 고르기(MAP-07)는 요청할 때마다 계산 |
| MATCH_PREFERENCES.age_min, age_max → age_groups (v2.3) | 연령대 칩 복수 선택 |
| SECRET_MAPS.updated_at 추가 (v2.3) | 최근 업데이트 순 정렬 |
| USERS.id → uuid(Supabase 회원 id), email·password_hash 삭제, 사용자 FK 전부 uuid (v2.4) | 로그인을 Supabase Auth가 담당 |
| 모든 테이블 RLS 켜고 허용 정책 없음 (v2.4) | 앱이 공개 키로 DB를 직접 읽지 못하게 |
| USERS.match_slots 기본 5, BLOCKS.reason·detail·feedback·feedback_at 추가 (v2.5) | 무료 5칸, 언제든 차단(사유 필수), 차단당한 쪽 피드백 |
| SECRET_MAPS.title_translated 추가 (v2.6) | 여행자에게 지도 제목을 일본어로 보여 줌 (MAP-07·08) |
| MATCHES.cancel_reason·cancel_detail·canceled_by 추가 (v2.6) | 매칭 끊기 사유(선택)와 끊은 사람 기록 (MATCH-07) |
| MATCHES.traveler_chat_ok·mate_chat_ok 사용 안 함, chat_status 값 LOCKED·READY·OPEN (v2.6) | 채팅은 여행자가 바로 연다 (CHAT-01) |
| VISIT_REACTIONS는 그대로 두고 행 종류로 구분 (v2.6) | emoji가 있는 행 = 리액션(방문 기록당 1개, LIKE·LAUGH·CHEER), comment가 있는 행 = 댓글. 테이블 변경 없이 VISIT-03~05 지원 |
