import { Redirect, useRouter } from "expo-router";
import { MapSpikeScreen } from "../../src/features/map-spike/MapSpikeScreen";

// Q-01 검증 전용 경로. 개발 빌드에서만 열린다.
export default function DevMap() {
  const router = useRouter();
  if (!__DEV__) return <Redirect href="/" />;
  return <MapSpikeScreen onBack={() => router.dismissTo("/auth")} />;
}
