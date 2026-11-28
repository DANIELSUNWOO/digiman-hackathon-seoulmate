import { Redirect, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect } from "react";
import { useOnboardingDismiss } from "../../src/features/onboarding/navigation";
import { TripScreen } from "../../src/features/trip/TripScreen";
import { syncTripDraftAccount } from "../../src/features/trip/draft";
import { useSession } from "../../src/session";

export default function TripRoute() {
  const navigation = useNavigation();
  const dismiss = useOnboardingDismiss();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { session, load, flow, ready, busy } = useSession();
  const id = session?.user.id ?? null;
  useEffect(() => {
    syncTripDraftAccount(id);
  }, [id]);
  if (!ready || busy || load.kind === "loading") return null;
  if (!session) return <Redirect href="/auth" />;
  if (
    load.kind !== "ready" ||
    load.me.userId !== id ||
    load.me.role !== "TRAVELER"
  )
    return <Redirect href="/account" />;
  const o = load.me.onboarding;
  if (!o.verified) return <Redirect href="/(onboarding)/verification" />;
  if (!o.profile) return <Redirect href="/(onboarding)/profile" />;
  if (!o.tags) return <Redirect href="/(onboarding)/tags" />;
  if (!o.preferences) return <Redirect href="/(onboarding)/preferences" />;
  const origin = from === "account" ? "account" : "onboarding";
  const owned = () =>
    navigation.isFocused() && flow?.snapshot().session?.user.id === id;
  return (
    <TripScreen
      key={id}
      userId={id!}
      token={session.access_token}
      origin={origin}
      isCurrentAccount={owned}
      onBack={() =>
        dismiss(
          origin === "account"
            ? "/account"
            : "/(onboarding)/preferences?from=onboarding",
        )
      }
      refresh={async () => {
        if (!flow || !owned()) return false;
        await flow.refreshMember();
        const snap = flow.snapshot();
        return (
          owned() &&
          snap.session?.user.id === id &&
          snap.load.kind === "ready" &&
          snap.load.me.onboarding.trip === true
        );
      }}
      onDone={(source) => {
        if (!owned()) return;
        if (source === "account") dismiss("/account");
        else dismiss("/(tabs)");
      }}
    />
  );
}
