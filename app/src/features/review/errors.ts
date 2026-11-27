import { ApiError } from "../../api";
import type { ReviewStrings } from "./strings";

type ErrorKey = Extract<keyof ReviewStrings, `error${string}`>;

const SERVER_MESSAGES: Record<string, ErrorKey> = {
  NOT_MATCH_MEMBER: "errorForbidden",
  MATCH_NOT_FOUND: "errorForbidden",
  MATCH_NOT_COMPLETED: "errorNotCompleted",
  MATCH_NOT_ACTIVE: "errorBlocked",
  ALREADY_REVIEWED: "errorAlready",
  VALIDATION_ERROR: "errorInput",
};

/** 입력을 고치거나 다시 보내도 받아 주지 않는 코드 */
const CLOSED_CODES = new Set([
  "NOT_MATCH_MEMBER",
  "MATCH_NOT_FOUND",
  "MATCH_NOT_COMPLETED",
  "MATCH_NOT_ACTIVE",
]);

export function serverCode(error: unknown): string {
  return error instanceof ApiError ? (error.serverError?.code ?? "") : "";
}

export function isReviewClosed(error: unknown): boolean {
  return CLOSED_CODES.has(serverCode(error));
}

/** 화면 문구는 서버 message가 아니라 code로 앱이 정한다. */
export function errorText(
  error: unknown,
  text: ReviewStrings,
  fallback: string,
): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "NETWORK" || error.code === "TIMEOUT")
    return text.errorNetwork;
  if (error.code === "SESSION_EXPIRED") return text.errorSession;
  const key = SERVER_MESSAGES[serverCode(error)];
  return key ? text[key] : fallback;
}
