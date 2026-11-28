import { apiRequest } from "../../api";

export type Stats =
  | {
      role: "traveler";
      tripDay: number | null;
      matesMet: number;
      visitedSpots: number;
    }
  | {
      role: "mate";
      activeDays: number;
      travelersMet: number;
      completedMaps: number;
    };

type Request = (
  path: string,
  init: RequestInit,
  token: string,
) => Promise<unknown>;
const defaultRequest: Request = (path, init, token) =>
  apiRequest(path, init, token);
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error("Invalid stats");
  return value;
}
export function parseStats(raw: unknown, role: "traveler" | "mate"): Stats {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid stats");
  const value = raw as Record<string, unknown>;
  if (role === "traveler")
    return {
      role,
      tripDay: value.tripDay === null ? null : count(value.tripDay),
      matesMet: count(value.matesMet),
      visitedSpots: count(value.visitedSpots),
    };
  return {
    role,
    activeDays: count(value.activeDays),
    travelersMet: count(value.travelersMet),
    completedMaps: count(value.completedMaps),
  };
}
export function createStatsApi(request: Request = defaultRequest) {
  return async (
    token: string,
    role: "traveler" | "mate",
    signal?: AbortSignal,
  ) => {
    if (!token.trim()) throw new Error("Token required");
    return parseStats(
      await request("/users/me/stats", { method: "GET", signal }, token),
      role,
    );
  };
}
