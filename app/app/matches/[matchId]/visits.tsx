import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { parseMatchId, VisitListScreen } from "../../../src/features/visits";
import { useSession } from "../../../src/session";
import { nextStep } from "../../../src/users";

// 탭 바깥 경로라 탭과 같은 로그인·가입·온보딩 확인을 여기서 한다. 여행자·메이트 모두 쓴다.
export default function Visits(): ReactElement | null {
  const router = useRouter();
  const matchId = parseMatchId(useLocalSearchParams().matchId);
  const { session, ready, load, busy } = useSession();
  if (!ready) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready" || nextStep(load.me))
    return <Redirect href="/account" />;
  if (matchId === null) return <Redirect href="/(tabs)" />;

  return (
    <VisitListScreen
      // 다른 매칭으로 바뀌면 이전 목록을 남기지 않는다.
      key={matchId}
      matchId={matchId}
      lang={load.me.language}
      canWrite={load.me.role === "MATE"}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)")
      }
    />
  );
}
