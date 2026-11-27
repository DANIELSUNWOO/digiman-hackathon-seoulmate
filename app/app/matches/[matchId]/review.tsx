import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { parseMapId as parseId } from "../../../src/features/mate-home";
import { ReviewScreen } from "../../../src/features/review";
import { useSession } from "../../../src/session";
import { nextStep, onboardingRouteFor } from "../../../src/users";

// T-32 / M-41 상호 후기. 여행자와 메이트가 함께 쓴다.
export default function MatchReview(): ReactElement | null {
  const router = useRouter();
  const matchId = parseId(useLocalSearchParams().matchId);
  const { session, ready, load, busy } = useSession();
  if (!ready) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready") return <Redirect href="/account" />;
  const step = nextStep(load.me);
  if (step) return <Redirect href={onboardingRouteFor(step)} />;
  const { userId, role } = load.me;
  if (matchId === null || (role !== "TRAVELER" && role !== "MATE"))
    return <Redirect href="/(tabs)" />;

  return (
    <ReviewScreen
      key={`${userId}-${matchId}`}
      matchId={matchId}
      userId={userId}
      role={role}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)")
      }
    />
  );
}
