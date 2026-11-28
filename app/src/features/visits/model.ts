import { ApiError } from "../../api";
import type { VisitStrings } from "./strings";

/** 화면 문구는 서버 message가 아니라 code로 앱이 정한다. */
export function errorText(
  error: unknown,
  text: VisitStrings,
  fallback: string,
): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "NETWORK" || error.code === "TIMEOUT")
    return text.errorNetwork;
  if (error.code === "SESSION_EXPIRED") return text.errorSession;
  const serverCode = error.serverError?.code;
  if (serverCode === "NOT_MATCH_MEMBER" || serverCode === "MATCH_NOT_FOUND")
    return text.errorForbidden;
  return fallback;
}

/** 경로의 matchId는 양의 정수만 받는다. */
export function parseMatchId(
  value: string | string[] | undefined,
): number | null {
  return typeof value === "string" && /^[1-9]\d*$/.test(value)
    ? Number(value)
    : null;
}
