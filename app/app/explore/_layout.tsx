import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/session";
import { nextStep, onboardingRouteFor } from "../../src/users";
export default function ExploreLayout() {
  const { session, ready, load, busy } = useSession();
  if (!ready || busy || load.kind === "loading") return null;
  if (!session) return <Redirect href="/auth" />;
  if (load.kind !== "ready") return <Redirect href="/account" />;
  const step = nextStep(load.me);
  if (step) return <Redirect href={onboardingRouteFor(step)} />;
  if (load.me.role !== "TRAVELER") return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
