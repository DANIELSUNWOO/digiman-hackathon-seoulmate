import { ApiError } from "../../api";
import { strings } from "./strings";

const SERVER_MESSAGES: Record<string, string> = {
  NOT_VERIFIED: strings.errorNotVerified,
  NOT_MAP_OWNER: strings.errorNotOwner,
  MAP_NOT_FOUND: strings.errorMapNotFound,
  MAP_IN_USE: strings.errorMapInUse,
  MAP_LOCKED: strings.errorMapLocked,
  VALIDATION_ERROR: strings.errorValidation,
  PREVIEW_COUNT_INVALID: strings.errorPreviewCount,
  SPOT_NOT_IN_MAP: strings.errorSpotChanged,
};

/** 화면 문구는 서버 message가 아니라 code로 앱이 정한다. */
export function errorMessage(
  error: unknown,
  fallback: string = strings.errorDefault,
): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "NETWORK" || error.code === "TIMEOUT")
    return strings.errorNetwork;
  if (error.code === "SESSION_EXPIRED") return strings.errorSession;
  return SERVER_MESSAGES[error.serverError?.code ?? ""] ?? fallback;
}
