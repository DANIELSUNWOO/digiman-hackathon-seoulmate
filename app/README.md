# 서울메이트 앱 공통 기반

Expo와 TypeScript 설정, 한국어 및 일본어 폰트, 공통 디자인 토큰과 UI, 국적 선택 및 역할별 진입 화면을 제공합니다. 이메일 가입과 로그인, Spring 회원 등록 및 조회, 등록 복구와 온보딩 1차 화면(본인 인증 시연, 프로필 등록)을 구현했습니다. 소셜 로그인과 취향, 매칭 조건, 여행 일정 및 각 탭의 본 화면은 후속 작업입니다. Refs #8, #22.

## 시작

Node.js 24에서 저장소 루트의 `app`으로 이동해 실행합니다.

```bash
npm ci
npx expo start
```

웹은 `npx expo start --web`, 타입 검사는 `npm run typecheck`, 패키지 호환 검사는 `npx expo install --check`입니다. 오프라인 호환 검사는 Expo의 로컬 버전 목록을 사용하므로 온라인 확인과 구분해야 합니다.

앱 B는 `src/theme.ts`의 `theme`과 `src/ui.tsx`의 공통 컴포넌트를 import할 수 있습니다. `src/state.tsx`는 선택한 역할과 언어에 따른 표시 기반을 제공합니다. 예를 들어 앱의 `app` 폴더에 있는 화면에서는 다음과 같이 사용합니다.

```tsx
import { View } from "react-native";
import { theme } from "../src/theme";
import { Label } from "../src/ui";

export function NoticeBox() {
  return (
    <View style={{ padding: theme.space.lg }}>
      <Label>준비 중입니다</Label>
    </View>
  );
}
```

공통 `Label`은 선택한 역할에 맞춰 폰트를 적용합니다. `theme.typography`에는 폰트 패밀리가 포함되지 않으므로 React Native `Text`에 해당 스타일만 적용해도 폰트가 자동 선택되지는 않습니다.

## 디자인 기준 (v2 블루, DESIGN.md v3.0)

현재 디자인 기준은 개발 전달 패키지 v4의 `DESIGN.md` v3.0과 `02_tokens/tokens.flat.json`, `03_fonts/FONTS.md`입니다. 이전 오렌지와 노랑 기반 v1 기준은 폐기했습니다.

- **색상과 접근성:** `brand` `#477EFF`, `brandDeep` `#2F6BF0`, `brandTint` `#F0F5FF`, `accent` `#FFD84D` 등 35개 블루 v2 의미 토큰을 `src/theme.ts`에 정의했습니다. `accent` 노랑 포인트는 글자색으로 쓰지 않습니다.
- **앱 B 호환 별칭:** 열린 앱 B PR의 빌드와 동작을 깨뜨리지 않기 위해 기존 `main`, `mainSoft`, `mainInk`, `orange`, `tealSoft`, `tealInk` 등 v1 키를 유지하고 블루 v2 의미 색으로 매핑했습니다. 특히 `orange`는 알림 배지의 어두운 숫자 대비를 유지하기 위해 `accent` `#FFD84D`로 유지했으므로, 앱 B 후속 정리 시 각 의미에 맞는 블루 토큰(`brandDeep`, `positiveSoft`, `positive`)으로 전환해야 합니다.
- **폰트와 라이선스:** 본문은 역할별 `Noto Sans KR`과 `Noto Sans JP`(400, 500, 600, 700)를 사용합니다. 워드마크는 한국어 `Cafe24 Ssurround`(`assets/fonts/Cafe24Ssurround.ttf`, 라이선스 [CAFE24-OFL.txt](assets/fonts/CAFE24-OFL.txt))와 일본어 `Zen Maru Gothic 900`(`@expo-google-fonts/zen-maru-gothic`)을 사용합니다. 기존 `LINESeedKR-Bd.ttf`와 `OFL.txt`는 저장소 호환을 위해 보존하되 화면에서는 로드하지 않습니다.
- **공통 UI:** `src/ui.tsx`의 기존 컴포넌트(`Screen`, `Label`, `Button`, `Card`, `Input`, `Chip`, `BottomSheet`)와 props 호환을 유지한 채 블루 스타일(버튼 높이 52 반경 10, 입력창 흰 배경과 포커스 테두리, 선택 칩 `brandDeep` 채움과 흰 글자, 시트 상단 반경 20)을 적용했고, 현재 화면에 쓰는 `AppBar`, `Notice`, `ProgressTracker`, `TextLink`와 `src/brandAssets.tsx`의 B안 S코스 로고 및 국적 일러스트를 추가했습니다.
- **미정 및 범위 구분:** 스플래시 슬로건과 로그인 상단 서울 낮 전경 사진은 팀 최종본 확정 전 임시 표현입니다. `app.json`에는 임의의 owner, projectId, Android package나 iOS bundleId를 넣지 않았고 `eas.json`은 development client 프로필만 정의합니다.

`.env.example`은 인증과 지도 연동을 위한 설정 예시입니다. `EXPO_PUBLIC_` 값은 앱에 포함되므로 공개 가능한 값만 사용하고 비밀 키, DB 비밀번호와 LLM 키를 넣지 않습니다.

## 온보딩 1차 구현 (본인 인증 시연 및 프로필 등록)

여행자(`T-03`, `T-04`)와 메이트(`M-02`, `M-03`)가 공용으로 사용하는 본인 인증 시연 화면과 프로필 등록 화면을 `app/(onboarding)/` 및 `src/features/onboarding/`에 유지했습니다.

- 본인 인증 시연(`USER-02`)은 웹에서 `Blob`, 네이티브에서 `expo-file-system` 임시 캐시 파일 URI 또는 `expo-image-picker` 선택 URI를 `passportImage` multipart로 전송하고 완료 후 `USER-01`로 상태를 재확인하며 임시 파일과 여권 이미지는 보관하지 않습니다.
- 프로필 등록(`USER-03`)은 UTF-16 기준 닉네임 2~8자 및 소개 200자 카운터와 입력 검증을 일치시켰고, 성별, 출생연도 만 18세 검증, 선택 프로필 사진 업로드(15초 제한 및 취소 제어 포함)를 지원하며 저장 후 `USER-01`을 다시 확인합니다.
- 최신 화면 명세의 성별 `응답 안 함` 선택지는 현재 서버 `Gender` enum(`MALE`, `FEMALE`)에서 미지원 상태이므로 임의 성별로 변환하지 않고 안내 후 저장을 차단합니다.
- 실제 `images` 버킷 업로드 정책, 배포된 Spring API 주소와 웹 CORS, 실제 기기의 네이티브 폰트 로드와 카메라 및 사진 권한 동작은 아직 검증하지 않았습니다.
