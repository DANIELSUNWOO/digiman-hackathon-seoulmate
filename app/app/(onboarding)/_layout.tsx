import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";
import { syncDraftAccount } from "../../src/features/onboarding/draftStore";
import { useSession } from "../../src/session";
import { useRole } from "../../src/state";

export default function OnboardingLayout() {
  const { ready: roleReady, syncServerRole } = useRole();
  const { session, ready: sessionReady, load, busy } = useSession();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    syncDraftAccount(userId);
  }, [userId]);

  useEffect(() => {
    if (session && load.kind === "ready") {
      syncServerRole(load.me.role === "MATE" ? "mate" : "traveler");
    }
  }, [userId, load.kind === "ready" ? load.me.role : null, syncServerRole]);

  if (!roleReady || !sessionReady) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready") return <Redirect href="/account" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
