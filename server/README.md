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

## 파트 A·B 연결 지점 (선우님 제안 기준)

**테이블 소유권** — 남의 테이블은 Repository로 읽기만 직접, 쓰기는 주인 서비스를 통해서
- A(진용): users, match_preferences, user_tags, trips, matches, chat_messages, notifications, reports, blocks
- B(선우): tags, secret_maps, spots, spot_photos, spot_visits, visit_reactions, albums, reviews
- B 테이블의 엔티티·Repository·아래 `*Impl` 은 A가 임시로 만들어 둔 것. 선우님이 자유롭게 고치면 됨

**① A가 만들고 B가 씀**
| 이름 | 쓰임 |
|---|---|
| `AuthUser me` (컨트롤러 파라미터) | 로그인 사용자 id(uuid)·역할. 등록 전 404, 탈퇴 403 자동 |
| `throw new ApiException(ErrorCode.X)` | `status/code/message` 형식 자동 응답. ErrorCode 는 영역별로 묶어서 추가 |
| `NotificationPublisher.publish(UUID userId, NotificationType type, Long matchId, Object... extra)` | `{0}` 상대 닉네임은 자동. 방문 인증: `publish(mateId, VISIT, matchId, spotName)`, 리액션: `publish(travelerId, REACTION, matchId)` |
| `MatchAccess.requireMember(Long matchId, UUID userId)` → `MatchMembership` | 상태, 채팅 상태, 코스 지도 id, required_visits, 내 역할, 상대 id. 없으면 404, 당사자 아니면 403 |
| `MatchProgressService.onVisitVerified(Long matchId)` | VISIT-01 저장 직후 같은 트랜잭션에서. 필요 인증 수 도달 시 채팅 REQUESTED + 양쪽 알림(A). 반환값 = `chatRequested` |
| `MateEligibility.isListable(여행자, 매칭조건, 메이트)` | MATE-01 목록 조건 = MATCH-01 재검증 기준 |
| `BlockQueryService.blockedRelations(userId)` | 차단 관계 제외 |

**② B가 만들고 A가 씀** (인터페이스 + 임시 구현이 들어 있음. 선우님은 구현만 교체)
| 인터페이스 | 임시 구현 | A가 쓰는 곳 |
|---|---|---|
| `translation.TranslationService.translateAsync(target, id, text, from, to)` | `NoOpTranslationService` (번역 안 함) | 쪽지 보내기. **커밋 후 비동기**로 `*_translated` 채우기, 실패 시 null |
| `map.service.MapQuery.findPublicMaps / isPublic / spotCount` | `MapQueryImpl` (동작함) | 지도 목록, 코스 선택, required_visits 계산, 메이트 조건 |
| `visit.service.VisitQuery.countByMatch / authorOf / reactionAuthorOf / matchIdOfVisit / matchIdOfReaction` | `VisitQueryImpl` (동작함) | 진행률, 자동 종료·완료, 채팅 요청 판정, 신고 대상 확인 |
| `album.service.AlbumService.createForMatch(matchId, title, coverUrl)` → albumId | `AlbumServiceImpl` (동작함) | 여행 완료(MATCH-08), 자동 완료 배치 |

**공용 파일 규칙**: `build.gradle`, `application.yaml`, Security 설정, `ErrorCode` 는 고치기 전에 슬랙에 한마디. 브랜치는 `feature/sa-...`(A), `feature/sb-...`(B)

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
