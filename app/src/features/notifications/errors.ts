import { ApiError } from "../../api";
import type { NotificationStrings } from "./strings";

/** 화면 문구는 서버 message가 아니라 code로 앱이 정한다. */
export function errorText(
  error: unknown,
  text: NotificationStrings,
  fallback: string,
): string {
  if (!(error instanceof ApiError)) return fallback;
  // PR #14가 추가하는 TIMEOUT도 네트워크 문제로 안내하도록 문자열로 비교한다.
  const code: string = error.code;
  if (code === "NETWORK" || code === "TIMEOUT") return text.errorNetwork;
  if (code === "SESSION_EXPIRED") return text.errorSession;
  return fallback;
}
