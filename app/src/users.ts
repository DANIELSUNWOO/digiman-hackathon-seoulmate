import { ApiError, apiRequest } from "./api";

export type Me = {
  userId: string;
  email?: string;
  country: "JP" | "KR";
  role: "TRAVELER" | "MATE";
  language: "ja" | "ko";
  onboarding: {
    verified: boolean;
    profile: boolean;
    tags: boolean;
    preferences?: boolean;
    trip?: boolean;
  };
};

export async function getMe(
  token: string,
  userId: string,
  signal?: AbortSignal,
): Promise<Me> {
  const value = await apiRequest<Me>("/users/me", { signal }, token);
  const o = value?.onboarding;
  if (
    !value ||
    value.userId !== userId ||
    (value.role !== "TRAVELER" && value.role !== "MATE") ||
    (value.language !== "ja" && value.language !== "ko") ||
    (value.country !== "JP" && value.country !== "KR") ||
    (value.email !== undefined && typeof value.email !== "string") ||
    !o ||
    typeof o.verified !== "boolean" ||
    typeof o.profile !== "boolean" ||
    typeof o.tags !== "boolean" ||
    (value.role === "TRAVELER" &&
      (typeof o.preferences !== "boolean" || typeof o.trip !== "boolean"))
  ) {
    throw new ApiError("INVALID_RESPONSE", "Invalid member response");
  }
  return value;
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

export function nextStep(
  me: Me,
): "verification" | "profile" | "tags" | "preferences" | "trip" | null {
  const o = me.onboarding;
  if (!o.verified) return "verification";
  if (!o.profile) return "profile";
  if (!o.tags) return "tags";
  if (me.role === "TRAVELER" && !o.preferences) return "preferences";
  if (me.role === "TRAVELER" && !o.trip) return "trip";
  return null;
}
