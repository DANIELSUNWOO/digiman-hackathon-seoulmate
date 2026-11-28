import type { ConfigContext, ExpoConfig } from "expo/config";

// 정적 설정은 app.json에 두고, 환경변수가 필요한 플러그인만 여기서 붙인다.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "seoulmate",
  slug: config.slug ?? "seoulmate",
  plugins: [
    ...(config.plugins ?? []),
    [
      "@mj-studio/react-native-naver-map",
      // Client ID가 없으면 빌드는 되고, 실행 시 지도 인증 실패(800)가 난다.
      { client_id: process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ?? "" },
    ],
  ],
});
