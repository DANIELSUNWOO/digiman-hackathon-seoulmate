import { ApiError } from "../../api";
import { UploadError } from "../photo-upload";
import { strings } from "./strings";

const SERVER_MESSAGES: Record<string, string> = {
  NOT_MAP_OWNER: strings.errorNotOwner,
  MAP_NOT_FOUND: strings.errorMapNotFound,
  MAP_LOCKED: strings.errorLocked,
  VALIDATION_ERROR: strings.errorValidation,
};

/** 화면 문구는 서버 message가 아니라 code로 앱이 정한다. */
export function errorMessage(error: unknown): string {
  if (error instanceof UploadError) return strings.errorUpload;
  if (!(error instanceof ApiError)) return strings.errorDefault;
  if (error.code === "NETWORK" || error.code === "TIMEOUT")
    return strings.errorNetwork;
  if (error.code === "SESSION_EXPIRED") return strings.errorSession;
  return SERVER_MESSAGES[error.serverError?.code ?? ""] ?? strings.errorDefault;
}
