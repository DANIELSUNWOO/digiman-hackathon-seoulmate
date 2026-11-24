# 서울메이트 (ソウルメイト, 가칭)

서울에 사는 한국인 **메이트**가 만든 **비밀지도**를 따라, 일본인 **여행자**가 취향에 맞는 서울 여행을 하는 모바일 앱입니다.
DigiMan Hackathon (KOREC) 본선 출품작 · 본선 11/29

> 여행자는 취향이 맞는 메이트를 찾아 매칭 → 메이트의 지도 중 하나를 코스로 골라 → 스팟을 방문 인증하고 → 50%를 채우면 메이트와 채팅 → 여행이 끝나면 앨범과 후기를 남깁니다. 메이트가 쓴 글과 채팅은 AI가 일본어 ↔ 한국어로 번역합니다.

---

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 앱 | React Native + Expo (EAS Build) |
| 로그인 · 사진 저장 · DB | Supabase (Auth, Storage, Postgres) |
| API 서버 | Spring Boot |
| 지도 | 네이버 지도 (`@mj-studio/react-native-naver-map`) + 장소 검색 API |
| AI 번역 | LLM API (Spring 서버에서 호출) |

```
[앱] ──로그인·사진 업로드──▶ [Supabase Auth / Storage]
  │
  └──Bearer 토큰──▶ [Spring Boot API] ──▶ [Supabase Postgres]
                         └──▶ LLM API, 장소 검색 API
```

- 앱은 DB에 직접 접근하지 않습니다. 모든 테이블에 RLS를 켜고 허용 정책을 두지 않으며, 데이터는 Spring 서버로만 오갑니다.
- Spring은 Supabase가 발급한 토큰을 JWKS로 검증합니다.

## 폴더 구조

```
.
├── app/      # React Native (Expo) 앱
├── server/   # Spring Boot API 서버
└── docs/     # 요구사항, ERD, API 명세서, 사용자 흐름, 결정 사항
```

## 문서

| 문서 | 파일 |
| --- | --- |
| 요구사항 정의서 | [docs/01-requirements.md](docs/01-requirements.md) |
| ERD | [docs/02-erd.md](docs/02-erd.md) · [이미지](docs/02-erd.png) |
| API 명세서 | [docs/03-api-spec.md](docs/03-api-spec.md) |
| 사용자 흐름 | [docs/04-user-flow.png](docs/04-user-flow.png) |
| 결정 사항 | [docs/decisions/](docs/decisions/) |

문서는 파일 이름을 바꾸지 않고 덮어써서 갱신합니다. 각 문서 맨 위에 버전과 변경 내용이 적혀 있습니다.

## 실행 방법

각 폴더의 README를 참고하세요.

- 앱: [app/README.md](app/README.md)
- 서버: [server/README.md](server/README.md)

## 협업 규칙

### 브랜치

- `main`: 항상 실행되는 상태 유지. **직접 push 금지, PR로만 머지**
- 작업 브랜치: `feature/파트-기능` (예: `feature/a-match-apply`, `feature/c-spot-register`)
  - 파트: `a` 서버 · `b` 앱 기반·온보딩 · `c` 지도·메이트 화면 · `d` 여행자 매칭·소통 화면
- 버그 수정: `fix/파트-내용`

### 커밋 메시지 (Conventional Commits, 영어)

```
feat: add mate search API with sort and pin filter
fix: return 409 when chat is not open
docs: update API spec to v1.4
chore: add .env.example for server
refactor: extract distance calculation to util
```

### PR

- PR 템플릿을 채우고, 리뷰어 1명 승인 후 머지
- 저녁에 하루 작업을 main에 머지

### 비밀 값

- `.env`는 절대 커밋하지 않습니다. 각 폴더의 `.env.example`을 복사해서 `.env`를 만들고 값을 채우세요.
- 키는 **DM으로만** 공유합니다. 채널·이슈·PR에 붙여 넣지 마세요.
- 앱 `.env`에는 공개해도 되는 값만 넣습니다 (`EXPO_PUBLIC_*` 값은 앱 파일 안에 그대로 들어갑니다).
