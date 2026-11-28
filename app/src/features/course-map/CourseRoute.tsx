import React from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { parseMapId } from "../mate-home";
import { useSession } from "../../session";
import { nextStep } from "../../users";
import { useScopedNavigation } from "./useScopedNavigation";
import { CourseScreen } from "./CourseScreen";
export function CourseRoute({ detail = false }: { detail?: boolean }) {
  const params = useLocalSearchParams(),
    router = useRouter();
  const matchId = parseMapId(params.matchId),
    spotId = detail ? parseMapId(params.spotId) : null;
  const { ready, session, load, busy } = useSession();
  const navigate = useScopedNavigation(
    JSON.stringify([
      session?.user.id,
      session?.access_token,
      matchId,
      spotId,
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
  if (
    load.me.role !== "TRAVELER" ||
    matchId === null ||
    (detail && spotId === null)
  )
    return <Redirect href="/(tabs)" />;
  return (
    <CourseScreen
      key={`${session.user.id}-${matchId}-${spotId}`}
      account={session.user.id}
      token={session.access_token}
      matchId={matchId}
      spotId={spotId ?? undefined}
      onBack={() =>
        navigate(() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)"),
        )
      }
      onSpot={(id) =>
        navigate(() =>
          router.push({
            pathname: "/matches/[matchId]/spots/[spotId]",
            params: { matchId: String(matchId), spotId: String(id) },
          }),
        )
      }
      onVerify={(id) =>
        navigate(() =>
          router.push({
            pathname: "/visit/verify",
            params: { matchId: String(matchId), spotId: String(id) },
          }),
        )
      }
      onVisits={() =>
        navigate(() =>
          router.push({
            pathname: "/matches/[matchId]/visits",
            params: { matchId: String(matchId) },
          }),
        )
      }
      onComplete={() =>
        navigate(() =>
          router.push({
            pathname: "/matches/[matchId]/complete",
            params: { matchId: String(matchId) },
          }),
        )
      }
      onChat={() =>
        navigate(() =>
          router.push({
            pathname: "/chats/[matchId]",
            params: { matchId: String(matchId) },
          }),
        )
      }
    />
  );
}
