import { apiRequest } from "../../api";
import { validateReason, validateTarget, type ReportTarget } from "./model";

export type SafetyRequest = (
  path: string,
  init: RequestInit,
  token: string,
) => Promise<unknown>;
const defaultRequest: SafetyRequest = (path, init, token) =>
  apiRequest(path, init, token);
function positiveId(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid match");
}
function requireToken(token: string) {
  if (!token.trim()) throw new Error("Token required");
}
export function createSafetyApi(request: SafetyRequest = defaultRequest) {
  return {
    async report(
      token: string,
      matchId: number,
      target: ReportTarget,
      reason: string,
      detail: string,
    ) {
      requireToken(token);
      positiveId(matchId);
      const valid = validateTarget(target);
      const data = validateReason(reason, detail);
      const raw = await request(
        "/reports",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId,
            targetType: valid.type,
            targetId: valid.id,
            ...data,
          }),
        },
        token,
      );
      if (
        !raw ||
        typeof raw !== "object" ||
        !Number.isSafeInteger((raw as { reportId?: unknown }).reportId) ||
        Number((raw as { reportId: number }).reportId) < 1
      )
        throw new Error("Invalid report response");
    },
    async block(
      token: string,
      matchId: number,
      reason: string,
      detail: string,
    ) {
      requireToken(token);
      positiveId(matchId);
      const raw = await request(
        `/matches/${matchId}/block`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validateReason(reason, detail)),
        },
        token,
      );
      if (
        !raw ||
        typeof raw !== "object" ||
        (raw as { matchId?: unknown }).matchId !== matchId ||
        typeof (raw as { status?: unknown }).status !== "string"
      )
        throw new Error("Invalid block response");
    },
    async blocked(token: string, partnerId: string, signal?: AbortSignal) {
      requireToken(token);
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          partnerId,
        )
      )
        throw new Error("Invalid partner");
      const raw = await request(
        "/users/me/blocks",
        { method: "GET", signal },
        token,
      );
      if (!Array.isArray(raw)) throw new Error("Invalid blocks response");
      return raw.some((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          !item.user ||
          typeof item.user.userId !== "string"
        )
          throw new Error("Invalid blocked user");
        return item.user.userId.toLowerCase() === partnerId.toLowerCase();
      });
    },
  };
}
export type SafetyApi = ReturnType<typeof createSafetyApi>;
