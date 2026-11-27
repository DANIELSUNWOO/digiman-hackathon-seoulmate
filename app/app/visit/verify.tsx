import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { parseMapId as parseId } from "../../src/features/mate-home";
import { VisitVerifyScreen } from "../../src/features/visit-verify";
import { useSession } from "../../src/session";
import { nextStep, onboardingRouteFor } from "../../src/users";

// /visit/verify?matchId&spotId. 코스 지도(클라 P)에서 들어온다.
// 탭 바깥 경로라 탭과 같은 로그인·가입·온보딩 확인을 여기서 한다. 여행자만 쓴다.
export default function VisitVerify(): ReactElement | null {
  const router = useRouter();
  const params = useLocalSearchParams();
  const matchId = parseId(params.matchId);
  const spotId = parseId(params.spotId);
  const { session, ready, load, busy } = useSession();
  if (!ready) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready") return <Redirect href="/account" />;
  const step = nextStep(load.me);
  if (step) return <Redirect href={onboardingRouteFor(step)} />;
  if (load.me.role !== "TRAVELER" || matchId === null || spotId === null)
    return <Redirect href="/(tabs)" />;

  return (
    <VisitVerifyScreen
      // 다른 스팟으로 바뀌면 쓰던 사진과 후기를 남기지 않는다.
      key={`${matchId}-${spotId}`}
      matchId={matchId}
      spotId={spotId}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)")
      }
    />
  );
}
