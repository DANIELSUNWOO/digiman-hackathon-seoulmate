import { ApiError } from "../../api";
import { strings } from "./strings";

const SERVER_MESSAGES: Record<string, string> = {
  PLACE_SEARCH_UNAVAILABLE: strings.errorUnavailable,
  ROLE_FORBIDDEN: strings.errorRole,
  VALIDATION_ERROR: strings.errorValidation,
};

/** 화면 문구는 서버 message가 아니라 code로 앱이 정한다. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return strings.errorDefault;
  if (error.code === "NETWORK" || error.code === "TIMEOUT")
    return strings.errorNetwork;
  if (error.code === "SESSION_EXPIRED") return strings.errorSession;
  return SERVER_MESSAGES[error.serverError?.code ?? ""] ?? strings.errorDefault;
}
