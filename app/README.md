# 서울메이트 앱 공통 기반

Expo와 TypeScript 설정, 한국어 및 일본어 폰트, 공통 디자인 토큰과 UI, 국적 선택 및 역할별 진입 화면을 제공합니다. 이메일 가입과 로그인, Spring 회원 등록 및 조회, 등록 복구와 온보딩 단계 판정을 구현했습니다. 소셜 로그인과 온보딩 본 화면 및 각 탭의 기능은 준비 중입니다. Refs #8. 앱 B의 지도 작업 #7에서 사용할 선행 기반입니다.

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

export function Notice() {
  return (
    <View style={{ padding: theme.space.lg }}>
      <Label>준비 중입니다</Label>
    </View>
  );
}
```

공통 `Label`은 선택한 역할에 맞춰 폰트를 적용합니다. `theme.typography`에는 폰트 패밀리가 포함되지 않으므로 React Native `Text`에 해당 스타일만 적용해도 폰트가 자동 선택되지는 않습니다.

## 디자인 기준과 후속 작업

디자인 기준은 전달된 DESIGN.md v1.7이며 토큰 JSON과 CSS도 대조했습니다. 전달 ZIP의 README는 실제 값에서 `02_tokens`를 우선합니다. 이에 따라 DESIGN.md 표의 display 800과 body-2 600 대신 토큰 파일의 display 700과 body-2-medium 500을 사용했습니다. 색상과 역할, 최소 글자 크기 및 터치 크기는 확정 기준입니다. 간격과 반경, 그림자, 모션 및 일부 타입 규칙은 원문에서 추정 또는 제안으로 표시되어 있어 확정된 팀 규칙으로 단정하지 않습니다. 화면 배치는 와이어프레임을 따릅니다. 일본어 로고용 LINE Seed JP 폰트는 아직 포함하지 않아 대체 폰트로 표시됩니다.

`app.json`에는 임의의 owner, projectId, Android package나 iOS bundleId를 넣지 않았습니다. `eas.json`은 내부 배포용 development client 프로필만 정의합니다. Expo 계정 연결, 식별자와 자격 증명, EAS 빌드 및 실제 기기 검증은 후속 작업입니다. 지도 라이브러리 설치는 앱 B 작업 범위입니다.

`.env.example`은 인증과 지도 연동을 위한 설정 예시입니다. `EXPO_PUBLIC_` 값은 앱에 포함되므로 공개 가능한 값만 사용하고 비밀 키, DB 비밀번호와 LLM 키를 넣지 않습니다. 실제 인증에는 접근 가능한 Spring API 주소 및 약관 자료 확인이 필요합니다. 실제 인증 성공, 실제 서버 연동과 네이티브 기기 동작은 검증되지 않았습니다. 회원 조회 결과가 온보딩 미완료이면 계정 화면에서 다음 단계를 안내하며 미구현 화면으로 이동하지 않습니다.

한국어 로고 폰트 `LINESeedKR-Bd.ttf`의 라이선스 원문은 [OFL.txt](assets/fonts/OFL.txt)에 동봉했습니다. 출처는 [LINE Seed 공식 저장소](https://github.com/line/seed/blob/main/OFL.txt)입니다.

공통 `Label`의 `weight="medium"`으로 역할별 Noto Sans 500 폰트를 선택할 수 있습니다. `language`로 언어를 명시할 수 있으며 `Button`도 같은 언어 옵션을 지원합니다. 선택 카드와 칩은 각각 다른 배경색을 사용합니다. 네이티브 기기에서 폰트와 그림자 표시를 확인하지 않았으며 Android elevation과 위험 상태 변형은 후속 화면 요구에 맞춰 결정해야 합니다.

`Card`를 선택 상태로 표시할 때 내부 `Label`에도 같은 `selected` 값을 전달하면 선택 글자색을 적용합니다. `Chip`은 자체 선택 상태에 맞춰 배경과 글자색 및 굵기를 처리합니다.

## 온보딩 1차 구현 (본인 인증 시연 및 프로필 등록)

여행자(`T-03`, `T-04`)와 메이트(`M-02`, `M-03`)가 공용으로 사용하는 본인 인증 시연 화면과 프로필 등록 화면을 `app/(onboarding)/` 및 `src/features/onboarding/`에 추가했습니다.

- 본인 인증 시연(`USER-02`)은 웹에서 `Blob`, 네이티브에서 `expo-file-system` 임시 캐시 파일 URI 또는 `expo-image-picker` 선택 URI를 `passportImage` multipart로 전송하고 완료 후 `USER-01`로 상태를 재확인하며 임시 파일과 여권 이미지는 보관하지 않습니다.
- 프로필 등록(`USER-03`)은 UTF-16 기준 닉네임 2~8자 및 소개 200자 카운터와 입력 검증을 일치시켰고, 성별, 출생연도 만 18세 검증, 선택 프로필 사진 업로드(15초 제한 및 취소 제어 포함)를 지원하며 저장 후 `USER-01`을 다시 확인합니다.
- 최신 화면 명세의 성별 `응답 안 함` 선택지는 현재 서버 `Gender` enum(`MALE`, `FEMALE`)에서 미지원 상태이므로 임의 성별로 변환하지 않고 안내 후 저장을 차단합니다.
- 실제 `images` 버킷 업로드 정책, 배포된 Spring API 주소와 웹 CORS, 실제 기기의 사진 권한 및 카메라 동작은 아직 검증하지 않았습니다.
