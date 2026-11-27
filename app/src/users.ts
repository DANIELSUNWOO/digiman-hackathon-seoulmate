import { ApiError, apiRequest } from "./api";

export type GenderCode = "MALE" | "FEMALE";
export type VerifyStatus = "NONE" | "VERIFIED";

export type Me = {
  userId: string;
  email?: string;
  country: "JP" | "KR";
  role: "TRAVELER" | "MATE";
  language: "ja" | "ko";
  nickname?: string;
  gender?: GenderCode;
  birthYear?: number;
  ageGroup?: number;
  profileImageUrl?: string;
  bio?: string;
  verifyStatus?: VerifyStatus;
  onboarding: {
    verified: boolean;
    profile: boolean;
    tags: boolean;
    preferences?: boolean;
    trip?: boolean;
  };
};

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalInt(value: unknown): value is number | undefined {
  return value === undefined || Number.isInteger(value);
}

export function validateMe(raw: unknown, userId: string): Me {
  const value = raw as Partial<Me> | null | undefined;
  const o = value?.onboarding;
  if (
    !value ||
    value.userId !== userId ||
    (value.role !== "TRAVELER" && value.role !== "MATE") ||
    (value.language !== "ja" && value.language !== "ko") ||
    (value.country !== "JP" && value.country !== "KR") ||
    !isOptionalString(value.email) ||
    !isOptionalString(value.nickname) ||
    (value.gender !== undefined &&
      value.gender !== "MALE" &&
      value.gender !== "FEMALE") ||
    !isOptionalInt(value.birthYear) ||
    !isOptionalInt(value.ageGroup) ||
    !isOptionalString(value.profileImageUrl) ||
    !isOptionalString(value.bio) ||
    (value.verifyStatus !== undefined &&
      value.verifyStatus !== "NONE" &&
      value.verifyStatus !== "VERIFIED") ||
    !o ||
    typeof o.verified !== "boolean" ||
    typeof o.profile !== "boolean" ||
    typeof o.tags !== "boolean" ||
    (value.role === "TRAVELER" &&
      (typeof o.preferences !== "boolean" || typeof o.trip !== "boolean"))
  ) {
    throw new ApiError("INVALID_RESPONSE", "Invalid member response");
  }
  return value as Me;
}

export async function getMe(
  token: string,
  userId: string,
  signal?: AbortSignal,
): Promise<Me> {
  const value = await apiRequest<unknown>("/users/me", { signal }, token);
  return validateMe(value, userId);
}

export function registerUser(
  token: string,
  country: "JP" | "KR",
  signal?: AbortSignal,
) {
  return apiRequest<{ userId: string; role: string; language: string }>(
    "/users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, agreeTerms: true }),
      signal,
    },
    token,
  );
}

export type OnboardingStep =
  "verification" | "profile" | "tags" | "preferences" | "trip" | null;

export function nextStep(me: Me): OnboardingStep {
  const o = me.onboarding;
  if (!o.verified) return "verification";
  if (!o.profile) return "profile";
  if (!o.tags) return "tags";
  if (me.role === "TRAVELER" && !o.preferences) return "preferences";
  if (me.role === "TRAVELER" && !o.trip) return "trip";
  return null;
}

export type OnboardingTargetRoute =
  | "/(onboarding)/verification"
  | "/(onboarding)/profile"
  | "/account"
  | "/(tabs)";

export function onboardingRouteFor(
  step: OnboardingStep,
): OnboardingTargetRoute {
  if (step === "verification") return "/(onboarding)/verification";
  if (step === "profile") return "/(onboarding)/profile";
  if (step === null) return "/(tabs)";
  return "/account";
}
