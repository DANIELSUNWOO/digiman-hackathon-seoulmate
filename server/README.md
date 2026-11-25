# server (Spring Boot)

API 명세서 v1.4 / ERD v2.4 기준. 파트 A(골격·매칭 생애주기·소통) 구현이 들어 있고, 파트 B가 바로 올라탈 수 있게 연동 지점을 열어 두었습니다.

## 준비물
- JDK 21, IntelliJ
- Supabase 프로젝트 접근 권한 (DB 접속 정보, 프로젝트 ref)

## 실행
```bash
cd server
cp .env.example .env   # 값 채우기 (DM으로 받기)
./gradlew bootRun      # Windows: gradlew.bat bootRun
```
- 처음 실행하면 Flyway가 `src/main/resources/db/migration/V1__init_schema.sql` 로 테이블 17개를 만들고 RLS를 켭니다.
- Swagger: http://localhost:8080/swagger-ui.html → **Authorize** 에 Supabase access token 을 넣고 테스트
- 테스트: `./gradlew test` (H2 메모리 DB 사용, Supabase 없어도 됨)

## 규칙
- API는 `docs/03-api-spec.md`를 그대로 따릅니다. 바꿔야 하면 문서를 먼저 고치고 팀에 공유합니다.
- 비밀 값은 환경변수로만 읽습니다. `application.yaml`에 값을 직접 쓰지 않습니다.
- 스키마를 바꿀 때는 `V1`을 고치지 말고 `V2__설명.sql` 을 새로 추가합니다.

## 인증 흐름
1. 앱이 Supabase SDK로 가입·로그인 → access token
2. 앱이 `POST /api/v1/users` (AUTH-01) 로 국적·약관 등록 → USERS.id = 토큰의 sub
3. 이후 모든 API: `Authorization: Bearer {token}`
4. Spring은 JWKS로 서명·만료·발급자(iss)·대상(aud=authenticated)을 검증 (`global/config/SecurityConfig`)
5. 컨트롤러에서 `AuthUser me` 파라미터를 쓰면 등록된 활동 회원이 자동으로 채워짐 (등록 전 404 `USER_NOT_REGISTERED`, 탈퇴 403 `WITHDRAWN_USER`)

## 파트 A 티켓 ↔ 코드

| # | 티켓 | 구현 | API |
|---|---|---|---|
| 1 | Spring 골격, JWT, 공통 에러, 마이그레이션, CI | `global/*`, `db/migration` | AUTH-01 |
| 2 | 온보딩 (프로필·취향·조건·일정·18세) | `user/*`, `tag/*`, `trip/*` | USER-01~05, TAG-01~02, PREF-01~02, TRIP-01~03 |
| 3 | 알림 (발행 인터페이스, 목록) | `notification/*` | NOTI-01~04 + `NotificationPublisher` |
| 4 | 매칭 신청·취소, 칸, 정원 10명 동시성, 상태머신 | `match/domain/Match*`, `MatchService`, `MateEligibility` | MATCH-01, 02, 03, 07, 08 |
| 5 | 지도 목록(공개 필드 제한), 코스 선택 | `CourseService` | MATCH-04, 05, 06 |
| 6 | 채팅 열기 요청·양쪽 수락, 쪽지 | `chat/*`, `MatchProgressService` | CHAT-01~03 |
| 7 | 자동 종료·자동 완료 | `MatchLifecycleJob`, `DevController` | 배치(매일 00:10) + DEV-01 |
| 8 | 신고·차단 | `safety/*` | REPORT-01, BLOCK-01, 02 |

## 파트 B 연동 (여기만 맞추면 됨)

엔티티·Repository는 마이그레이션과 함께 17개 테이블 전부 만들어 두었습니다. `[서버 B 소유]` 표시된 클래스(`map`, `visit`, `album`)에는 파트 B가 자유롭게 메서드를 추가하면 됩니다.

| 방향 | 무엇 | 어떻게 |
|---|---|---|
| B → A | 알림 보내기 | `notificationPublisher.publish(받는사람id, NotificationType.VISIT, matchId, 닉네임, 스팟이름)` |
| B → A | 방문 인증 후 채팅 요청 판정 | VISIT-01 저장 직후 **같은 트랜잭션에서** `matchProgressService.onVisitVerified(matchId)` → 반환값을 응답 `chatRequested` 에 |
| B → A | 당사자 권한 검사 | `matchAccess.member(matchId, me)` / `travelerMember(...)` / `mateMember(...)` |
| B → A | 메이트 찾기(MATE-01) 목록 조건 | `mateEligibility.isListable(여행자, 매칭조건, 메이트)` — MATCH-01 재검증과 같은 기준 |
| B → A | 차단 관계 제외 | `blockQueryService.blockedRelations(travelerId)` |
| B → A | 지도 공개 조건 (5곳 + 공개 2곳) | `mapVisibility.isPublic(mapId)` |
| B → A | 지도·스팟 수정 시 | `secretMap.touch(now)` 로 updated_at 갱신 ("최근 업데이트 순") |
| A → B | 번역 요청 | `TranslationRequestedEvent` 발행 → B가 `@TransactionalEventListener(phase = AFTER_COMMIT)` + `@Async` 로 받아 `*_translated` 채움 |
| A → B | 여행 완료·자동 완료 시 앨범 | `MatchCompletedEvent` 발행 → B가 `@EventListener`(동기)로 받아 ALBUMS 생성 (제목/표지 null 이면 지도 이름/첫 인증 사진) |
| 공용 | 현재 사용자 | 컨트롤러 파라미터 `AuthUser me` |
| 공용 | 에러 | `throw new ApiException(ErrorCode.XXX)` → 명세서 형식 자동 응답 |
| 공용 | 정책 숫자 | `PolicyProperties` (`seoulmate.policy.*`) |
| 공용 | 번역 텍스트 응답 | `LocalizedText.of(원문, 번역, "ko")` |

## 보안 처리 요약
- Supabase 토큰을 JWKS로 검증 (서명, 만료, iss, aud), 탈퇴 회원의 남은 토큰은 매 요청 차단
- 모든 테이블 RLS 켬, 허용 정책 없음 → 앱의 공개 키로 DB 직접 조회 불가
- 매칭 API마다 당사자 검사(403 `NOT_MATCH_MEMBER`), 역할 검사(403 `ROLE_FORBIDDEN`)
- 매칭 신청 시 앱이 보낸 mateId를 믿지 않고 목록 조건을 서버에서 다시 확인
- 신고 대상자는 서버가 매칭 상대로 지정, 신고 대상 글이 정말 상대의 글인지 확인
- 비공개 스팟은 응답에 아예 넣지 않음 (MATCH-04), 여권 사진은 저장하지 않음 (USER-02)
- 메이트 정원 10명: 사용자 행 잠금으로 동시 신청해도 11건이 되지 않음 (`MatchApplyIntegrationTest` 에서 5명 동시 신청 검증)
- 500 응답에 내부 메시지·스택 노출 안 함, DEV API는 `DEMO_MODE=true` 일 때만 존재하고 그때도 로그인 필요

## 명세와 다르게 처리한 것 (팀 확인 필요)
| # | 내용 | 지금 구현 |
|---|---|---|
| 1 | REPORT-01 `PROFILE` 의 targetId = 상대 userId 인데, userId 가 uuid 라 bigint 칼럼에 못 넣음 | PROFILE 은 targetId 를 받지 않아도 되고, 서버가 matchId 를 저장 (대상자는 어차피 매칭 상대) |
| 2 | 프로필 최초 등록을 두 번 호출 | 409 `PROFILE_ALREADY_REGISTERED` (수정은 USER-04) — 명세에 코드 추가 필요 |
| 3 | 완료 후 차단 | 허용 (완료 후에도 채팅이 가능하므로) |
