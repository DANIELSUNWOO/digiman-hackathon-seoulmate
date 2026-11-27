import { ApiError } from "../../api";
import type { AlbumStrings } from "./strings";

type ErrorKey = Extract<keyof AlbumStrings, `error${string}`>;

const SERVER_MESSAGES: Record<string, ErrorKey> = {
  ALBUM_NOT_FOUND: "errorNotFound",
  NOT_MATCH_MEMBER: "errorForbidden",
  MATCH_NOT_FOUND: "errorForbidden",
};

/** 화면 문구는 서버 message가 아니라 code로 앱이 정한다. */
export function errorText(error: unknown, text: AlbumStrings): string {
  if (!(error instanceof ApiError)) return text.errorLoad;
  if (error.code === "NETWORK" || error.code === "TIMEOUT")
    return text.errorNetwork;
  if (error.code === "SESSION_EXPIRED") return text.errorSession;
  const key = SERVER_MESSAGES[error.serverError?.code ?? ""];
  return key ? text[key] : text.errorLoad;
}
