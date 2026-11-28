import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/session";
import { nextStep, onboardingRouteFor } from "../../src/users";
import { chatIdentityFromFlow } from "../../src/features/chat/identity";

export default function ChatsLayout() {
  const flow = useSession();
  if (!flow.ready) return null;
  if (!flow.session) return <Redirect href="/auth" />;
  if (flow.busy || flow.load.kind === "loading") return null;
  if (flow.load.kind !== "ready" || !chatIdentityFromFlow(flow))
    return <Redirect href="/account" />;
  const step = nextStep(flow.load.me);
  if (step && step !== "trip")
    return <Redirect href={onboardingRouteFor(step)} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
