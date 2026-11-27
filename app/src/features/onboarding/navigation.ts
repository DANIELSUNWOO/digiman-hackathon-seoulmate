import { useCallback, useRef } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { BackHandler } from "react-native";
import { nextStep, onboardingRouteFor, type Me } from "../../users";

export type OnboardingOrigin = "onboarding" | "account";

export type OnboardingNavStep =
  "verification" | "profile" | "tags" | "first-map";

export type OnboardingPreviousRoute =
  | "/(onboarding)/verification?from=onboarding"
  | "/(onboarding)/profile?from=onboarding"
  | "/(onboarding)/tags?from=onboarding"
  | "/account";

export function parseOnboardingOrigin(
  from: string | string[] | undefined,
): OnboardingOrigin | null {
  const value = Array.isArray(from) ? from[0] : from;
  if (value === "onboarding") return "onboarding";
  if (value === "account") return "account";
  return null;
}

export function previousOnboardingRoute(
  role: "TRAVELER" | "MATE",
  current: OnboardingNavStep,
  origin: OnboardingOrigin | null,
): OnboardingPreviousRoute {
  if (origin === "account") return "/account";
  if (role === "TRAVELER") {
    if (current === "tags") return "/(onboarding)/profile?from=onboarding";
    if (current === "profile")
      return "/(onboarding)/verification?from=onboarding";
    return "/account";
  }
  if (current === "first-map") return "/(onboarding)/tags?from=onboarding";
  if (current === "tags") return "/(onboarding)/profile?from=onboarding";
  return "/account";
}

export function nextRouteAfterProfileSave(
  me: Me,
  origin: OnboardingOrigin | null,
): string {
  if (origin === "account") return "/account";
  if (origin === "onboarding") return "/(onboarding)/tags?from=onboarding";
  const next = nextStep(me);
  if (next === "tags") return "/(onboarding)/tags?from=onboarding";
  return onboardingRouteFor(next);
}

export function nextRouteAfterTagsSave(
  fresh: Me,
  options: { origin: OnboardingOrigin | null; hadTagsBefore: boolean },
): string {
  if (options.origin === "account") return "/account";
  if (
    fresh.role === "MATE" &&
    (!options.hadTagsBefore || options.origin === "onboarding")
  ) {
    return "/maps/new?from=onboarding";
  }
  if (options.hadTagsBefore && options.origin !== "onboarding") {
    return "/account";
  }
  return onboardingRouteFor(nextStep(fresh));
}

export function useOnboardingBackHandler(handler: () => boolean) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useFocusEffect(
    useCallback(() => {
      if (!BackHandler || typeof BackHandler.addEventListener !== "function")
        return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () =>
        handlerRef.current(),
      );
      return () => sub?.remove?.();
    }, []),
  );
}

export function useOnboardingDismiss() {
  const router = useRouter();
  const navigating = useRef(false);
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      navigating.current = false;
      return () => {
        focused.current = false;
        navigating.current = false;
      };
    }, []),
  );
  return useCallback(
    (route: string) => {
      if (!focused.current || navigating.current) return;
      navigating.current = true;
      router.dismissTo(route);
    },
    [router],
  );
}
