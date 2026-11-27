# 서버 연동 안내 (앱 팀용) · API v1.7

> 자세한 요청·응답은 `docs/03-api-spec.md` (v1.7). 이 문서는 "어떤 순서로 무엇을 부르면 되는지"만 짧게 정리한다.
> 서버를 켜면 Swagger: `{서버 주소}/swagger-ui.html` → 오른쪽 위 **Authorize** 에 Supabase access token 을 넣고 바로 호출해 볼 수 있다.

## 1. 로그인과 토큰

1. 앱이 **Supabase SDK** 로 가입·로그인 → `session.access_token`
2. 모든 서버 요청 헤더: `Authorization: Bearer {access_token}`
3. 처음 한 번 `POST /api/v1/users` `{ "country": "JP" | "KR", "agreeTerms": true }` → 서버 회원 생성
   - JP = 여행자, KR = 메이트 (국적이 역할을 정한다)
4. 이후 앱 시작 때 `GET /api/v1/users/me`
   - `404 USER_NOT_REGISTERED` → 3번(국적 선택 화면)으로
   - `403 WITHDRAWN_USER` → 로그아웃

토큰이 만료되면 `401`. Supabase SDK 의 자동 갱신을 켜 두면 된다.

## 2. 에러 모양 (모든 API 공통)

```json
{ "status": 409, "code": "MAP_ALREADY_SELECTED", "message": "이미 고른 지도입니다.", "fieldErrors": [] }
```
앱은 `code` 로 분기하고, `message` 는 그대로 토스트에 써도 된다. 입력 검증 실패는 `400 VALIDATION_ERROR` + `fieldErrors[{field, reason}]`.

## 3. 여행자(일본) 흐름

| 화면 | 호출 |
|---|---|
| T-04 프로필 | `PUT /users/me/profile` (닉네임 2~8자) |
| T-05 취향 | `GET /tags` (분류 → 항목 → 세부 3단계) → `PUT /users/me/tags` (1개 이상, 개수 제한 없음, 항목·세부 모두). `AREA` 는 「行ってみたい街」로 여행자도 고른다 |
| T-06 매칭 조건 | `PUT /users/me/match-preferences` |
| T-07 일정 | `POST /trips` `{startDate, endDate}` |
| T-11 지도 고르기 | `GET /maps` (정렬·핀 필터, 미니 지도 동네 = `areaTagId`·응답 `areas`, `emptyReason` 으로 빈 화면 2종) |
| T-11b 미리보기 | `GET /maps/{mapId}/preview` |
| "この地図を選ぶ" | **`POST /matches {mapId}`** → 바로 `ON_COURSE`, `slots` 로 "빈 칸 n/5" 갱신 |
| T-20 홈(여행 중) | `GET /matches?state=active` (지도 여러 개면 캐러셀) |
| T-21 코스 지도 | `GET /matches/{id}/course` |
| T-23~25 인증 | 사진을 Supabase Storage 에 올린 뒤 `POST /matches/{id}/visits {spotId, photoUrl, review, lat, lng}` → 응답 `chatReady: true` 면 T-27 로 |
| T-27 채팅 열기 | `GET /matches/{id}` 의 `chat.canOpen` 이 true 일 때만 버튼 활성 → **`POST /matches/{id}/chat/open`** |
| T-28 쪽지 | `GET /matches/{id}/messages` (주기적으로 다시 부르기) · `POST .../messages {content}` |
| T-92·93 끊기 | `POST /matches/{id}/cancel {reason?, detail?}` → 홈으로, `slots` 갱신 |
| T-30 여행 완료 | `POST /matches/{id}/complete` → `albumId` |
| T-31·32 앨범·후기 | `GET /matches/{id}/album` · `POST /matches/{id}/reviews` |
| C-02a 받은 후기 | `GET /users/me/reviews` → `{average, count, distribution, items}` (여행자·메이트 공통) |
| C-02 마이 | `GET /users/me/stats` → `{tripDay, matesMet, visitedSpots}` (`tripDay` 는 여행 시작 전이면 null) |

## 4. 메이트(한국) 흐름

| 화면 | 호출 |
|---|---|
| M-02 가입 | `POST /users {country: "KR"}` 만 부르면 바로 `VERIFIED` (휴대폰 인증 화면은 시연용, 여권 API 안 부름) |
| M-03·04 프로필·취향 | 여행자와 같음. `AREA` 는 "잘 아는 동네" |
| M-10~14 지도 만들기 | `POST /maps` → 장소 검색 `GET /places/search?query=` → `POST /maps/{id}/spots` (5곳 이상) → `PUT /maps/{id}/previews` (정확히 2곳) |
| M-20 홈 | `GET /matches?state=active` → 개수가 "함께 여행 중 n / 10" |
| M-15 지도별 대화 목록 | **`GET /matches?mapId={mapId}`** (`chatStatus` 가 OPEN 이 아니면 잠금 표시) |
| M-22·23 여행자 상세·방문 기록 | `GET /matches/{id}` · `GET /matches/{id}/visits` |
| 리액션·댓글 | `PUT /visits/{visitId}/reaction {type: LIKE\|LAUGH\|CHEER}` · `DELETE` 로 해제 · `POST /visits/{visitId}/comments {content}` |
| M-31 쪽지 | 여행자와 같음 (메이트는 채팅을 열 수 없고, 여행자가 열면 `CHAT_OPEN` 알림) |
| M-93 끊기 | `POST /matches/{id}/cancel {reason?, detail?}` (응답에 `slots` 없음) |
| C-02 마이 | `GET /users/me/stats` → `{activeDays, travelersMet, completedMaps}` |

## 5. 공통

- **알림 (C-01)**: `GET /notifications`, `GET /notifications/unread-count` (벨 배지), `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`. 푸시는 MVP 에서 빼고 화면에 들어올 때·주기적으로 다시 부른다.
- **신고 (C-06)**: `POST /reports {matchId, targetType: PROFILE·VISIT·COMMENT·CHAT, targetId?(PROFILE 이면 생략), reason, detail?}`. 사유 6개: `ABUSIVE`, `CONTACT_REQUEST`, `FORCED_MEETING`, `SEXUAL`, `SPAM`, `OTHER`(detail 필수). 상대에게는 알리지 않는다.
- **차단 (C-04)**: `POST /matches/{id}/block {reason, detail?}`. 서버는 언제든 받지만 버튼은 채팅 메뉴에만 둔다. 차단된 쪽에게 매칭은 `ENDED` 로 보이고, 한 번 `POST /matches/{id}/block-feedback` 을 남길 수 있다.
- **끊기 사유 코드**: `FEW_SPOTS`, `PLAN_CHANGED`, `NOT_A_MATCH`, `NO_REPLY`, `UNCOMFORTABLE`, `CANNOT_HELP`, `OTHER` (모두 선택 사항)
- **번역**: 응답의 글은 `{ original, translated, sourceLang }`. `translated` 가 null 이면 원문을 보여 준다 (번역은 저장 뒤 몇 초 걸림). "원문 보기"는 `original`.
- **시간**: 모든 시각은 한국 시간 `+09:00` 이 붙은 ISO 형식.

## 6. 자주 나는 에러

| 코드 | 언제 | 앱 처리 |
|---|---|---|
| `NO_FREE_SLOT` | 5칸을 다 씀 | "枠がいっぱいです（5 / 5）" |
| `MAP_ALREADY_SELECTED` | 같은 지도를 또 고름(두 번 탭 등) | 무시하고 매칭 목록 새로고침 |
| `MAP_NOT_AVAILABLE` / `MATE_FULL` | 그사이 조건이 바뀜 | 목록 새로고침 |
| `TRIP_REQUIRED` / `PREFERENCES_REQUIRED` | 일정·매칭 조건 없음 | T-07 / T-06 으로 |
| `CHAT_NOT_READY` | 인증이 부족 | 버튼 비활성 유지 |
| `ROLE_FORBIDDEN` | 역할에 맞지 않는 API | 화면 분기 확인 |
| `NOT_MATCH_MEMBER` | 내 매칭이 아님 | 홈으로 |

## 7. 서버 배포 (시연용)

`server/Dockerfile` 로 Render·Railway 등에 그대로 올린다. 배포 화면의 환경 변수에 `server/.env.example` 항목(DB_URL, DB_USERNAME, DB_PASSWORD, SUPABASE_JWT_ISSUER, SUPABASE_JWKS_URL, LLM_API_KEY, DEMO_MODE)을 넣는다. 포트는 `PORT` 환경 변수를 자동으로 따른다. 키는 깃에 올리지 않는다.
