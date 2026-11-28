import { ApiError } from "../../api";
import { UploadError } from "../photo-upload";
import { strings } from "./strings";

const SERVER_MESSAGES: Record<string, string> = {
  NOT_MATCH_MEMBER: strings.errorForbidden,
  ROLE_FORBIDDEN: strings.errorForbidden,
  MATCH_NOT_FOUND: strings.errorForbidden,
  MATCH_NOT_ON_COURSE: strings.errorNotOnCourse,
  SPOT_NOT_IN_COURSE: strings.errorSpot,
  ALREADY_VISITED: strings.errorVisited,
  VALIDATION_ERROR: strings.errorInput,
};

/** 같은 내용으로 다시 보내도 결과가 같은 코드 */
const FINAL_CODES = new Set([
  "NOT_MATCH_MEMBER",
  "ROLE_FORBIDDEN",
  "MATCH_NOT_FOUND",
  "MATCH_NOT_ON_COURSE",
  "SPOT_NOT_IN_COURSE",
  "ALREADY_VISITED",
  "VALIDATION_ERROR",
]);

export function serverCode(error: unknown): string {
  return error instanceof ApiError ? (error.serverError?.code ?? "") : "";
}

export function canRetry(error: unknown): boolean {
  return !FINAL_CODES.has(serverCode(error));
}

/** 화면 문구는 서버 message가 아니라 code로 앱이 정한다. */
export function errorText(error: unknown, fallback: string): string {
  if (error instanceof UploadError) return strings.errorUpload;
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "NETWORK" || error.code === "TIMEOUT")
    return strings.errorNetwork;
  if (error.code === "SESSION_EXPIRED") return strings.errorSession;
  return SERVER_MESSAGES[serverCode(error)] ?? fallback;
}
