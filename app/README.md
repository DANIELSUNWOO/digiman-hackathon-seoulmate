# app (React Native + Expo)

> 파트 B 담당자가 Expo 프로젝트를 생성해 이 폴더에 올립니다.

## 준비물

- Node.js (LTS), VS Code
- Expo 계정 + `npm i -g eas-cli`
- 실제 폰에 설치한 **개발용 빌드** (네이버 지도 때문에 Expo Go는 사용할 수 없음)

## 실행

```bash
cd app
cp .env.example .env   # 값 채우기 (DM으로 받기)
npm install
npx expo start --dev-client
```

폰과 PC가 같은 와이파이에 있어야 합니다. 화면 코드를 고치면 바로 반영되고, 네이티브 모듈을 추가했을 때만 개발용 빌드를 다시 만듭니다.
