import { ApiError } from "../../api";

export const AGE_GROUPS = [20, 30, 40, 50] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];
export type GenderPreference = "ANY" | "SAME" | "MALE" | "FEMALE";
export type Preference = {
  genderPref: GenderPreference;
  ageGroups: AgeGroup[];
};

export function parsePreference(raw: unknown): Preference {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new ApiError("INVALID_RESPONSE", "Invalid preference");
  const v = raw as Record<string, unknown>;
  if (
    (v.genderPref !== "ANY" &&
      v.genderPref !== "SAME" &&
      v.genderPref !== "MALE" &&
      v.genderPref !== "FEMALE") ||
    !Array.isArray(v.ageGroups) ||
    !v.ageGroups.length ||
    v.ageGroups.some((x) => !AGE_GROUPS.includes(x as AgeGroup)) ||
    new Set(v.ageGroups).size !== v.ageGroups.length
  )
    throw new ApiError("INVALID_RESPONSE", "Invalid preference");
  return {
    genderPref: v.genderPref,
    ageGroups: [...v.ageGroups].sort((a, b) => a - b) as AgeGroup[],
  };
}
export function samePreference(
  a: Preference | null,
  b: Preference | null,
): boolean {
  if (!a || !b) return a === b;
  const x = parsePreference(a),
    y = parsePreference(b);
  return (
    x.genderPref === y.genderPref &&
    x.ageGroups.length === y.ageGroups.length &&
    x.ageGroups.every((v, i) => v === y.ageGroups[i])
  );
}
