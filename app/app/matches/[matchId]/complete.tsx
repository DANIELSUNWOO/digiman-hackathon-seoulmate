import React from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { parseMapId } from "../../../src/features/mate-home";
import { SessionCompletionScreen } from "../../../src/features/trip-completion/SessionCompletionScreen";
import { useSession } from "../../../src/session";
import { nextStep } from "../../../src/users";
import { useScopedNavigation } from "../../../src/features/course-map/useScopedNavigation";
export default function CompletionRoute() {
  const router = useRouter(),
    matchId = parseMapId(useLocalSearchParams().matchId);
  const { ready, session, load, busy } = useSession();
  const navigate = useScopedNavigation(
    JSON.stringify([
      session?.user.id,
      session?.access_token,
      matchId,
      ready,
      busy,
      load.kind,
      load.kind === "ready" ? load.me.role : null,
      load.kind === "ready" ? nextStep(load.me) : null,
    ]),
  );
  if (!ready) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready") return <Redirect href="/account" />;
  const step = nextStep(load.me);
  if (step && step !== "trip") return <Redirect href="/account" />;
  if (load.me.role !== "TRAVELER" || matchId === null)
    return <Redirect href="/(tabs)" />;
  return (
    <SessionCompletionScreen
      key={`${session.user.id}-${session.access_token}-${matchId}`}
      account={session.user.id}
      token={session.access_token}
      matchId={matchId}
      onBack={() =>
        navigate(() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)"),
        )
      }
      onAlbum={() =>
        navigate(() =>
          router.replace({
            pathname: "/matches/[matchId]/album",
            params: { matchId: String(matchId) },
          }),
        )
      }
    />
  );
}
