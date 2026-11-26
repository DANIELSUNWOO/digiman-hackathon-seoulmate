import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/session";
import { useRole } from "../../src/state";

// 탭 바깥 경로라 탭과 같은 로그인 확인을 여기서 한다. 지도 관리는 메이트만 쓴다.
export default function MapsLayout() {
  const { role, ready: roleReady } = useRole();
  const { session, ready: sessionReady } = useSession();
  if (!roleReady || !sessionReady) return null;
  if (!role || !session) return <Redirect href="/auth" />;
  if (role !== "mate") return <Redirect href="/map" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
