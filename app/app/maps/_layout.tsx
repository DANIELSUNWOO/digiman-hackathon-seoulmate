import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/session";
import { nextStep } from "../../src/users";

// 탭 바깥 경로라 탭과 같은 로그인·가입·온보딩 확인을 여기서 한다. 지도 관리는 메이트만 쓴다.
export default function MapsLayout() {
  const { session, ready, load, busy } = useSession();
  if (!ready) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready" || nextStep(load.me))
    return <Redirect href="/account" />;
  if (load.me.role !== "MATE") return <Redirect href="/map" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
