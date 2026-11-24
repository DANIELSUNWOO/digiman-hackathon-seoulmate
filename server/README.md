# server (Spring Boot)

> 파트 A 담당자가 Spring Boot 프로젝트를 생성해 이 폴더에 올립니다.

## 준비물

- JDK 17 이상, IntelliJ
- Supabase 프로젝트 접근 권한

## 실행

```bash
cd server
cp .env.example .env   # 값 채우기 (DM으로 받기)
./gradlew bootRun
```

## 규칙

- API는 [docs/03-api-spec.md](../docs/03-api-spec.md)를 그대로 따릅니다. 바꿔야 하면 문서를 먼저 고치고 팀에 공유합니다.
- 비밀 값은 환경변수로만 읽습니다. `application.yml`에 값을 직접 쓰지 않습니다.
