import { ApiError } from "../../api";
import { strings } from "./strings";

const SERVER_MESSAGES: Record<string, string> = {
  NOT_MATCH_MEMBER: strings.errorForbidden,
  MATCH_NOT_FOUND: strings.errorForbidden,
  MATCH_NOT_ON_COURSE: strings.errorNotOnCourse,
};

/** 화면 문구는 서버 message가 아니라 code로 앱이 정한다. */
export function errorText(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "NETWORK" || error.code === "TIMEOUT")
    return strings.errorNetwork;
  if (error.code === "SESSION_EXPIRED") return strings.errorSession;
  return SERVER_MESSAGES[error.serverError?.code ?? ""] ?? fallback;
}
