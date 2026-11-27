import { ApiError } from "./api";
export function errorMessage(error: unknown, ko: boolean): string {
  const e = error as { code?: string; status?: number } | null;
  if (e?.code === "over_request_rate_limit" || e?.status === 429)
    return ko
      ? "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
      : "リクエストが多すぎます。しばらくしてから再度お試しください。";
  if (error instanceof ApiError) {
    if (error.serverError?.code === "WITHDRAWN_USER")
      return ko ? "탈퇴한 계정입니다." : "退会済みのアカウントです。";
    if (error.code === "SESSION_EXPIRED" || error.status === 401)
      return ko
        ? "세션이 만료되었습니다. 다시 로그인해 주세요."
        : "セッションが切れました。再度ログインしてください。";
    if (error.code === "CONFIG_MISSING")
      return ko
        ? "서비스 연결을 준비 중입니다."
        : "サービスへの接続を準備中です。";
    if (error.code === "ABORTED")
      return ko
        ? "요청이 취소되었습니다."
        : "リクエストがキャンセルされました。";
    if (error.code === "NETWORK" || error.code === "TIMEOUT")
      return ko
        ? "연결을 확인하고 다시 시도해 주세요."
        : "接続を確認して再度お試しください。";
    if (error.code === "INVALID_RESPONSE")
      return ko
        ? "서버 응답을 확인할 수 없습니다. 다시 시도해 주세요."
        : "サーバーの応答を確認できません。再度お試しください。";
    return ko
      ? "요청을 처리하지 못했습니다. 다시 시도해 주세요."
      : "処理できませんでした。再度お試しください。";
  }
  if (e?.code === "invalid_credentials")
    return ko
      ? "이메일 또는 비밀번호를 확인해 주세요."
      : "メールアドレスまたはパスワードを確認してください。";
  if (e?.code === "email_not_confirmed")
    return ko
      ? "이메일 확인 후 로그인해 주세요."
      : "メールを確認してからログインしてください。";
  return ko
    ? "요청을 처리하지 못했습니다. 다시 시도해 주세요."
    : "処理できませんでした。再度お試しください。";
}
export function noticeMessage(notice: "partial" | "unconfirmed", ko: boolean) {
  return notice === "partial"
    ? ko
      ? "기기에서 로그아웃했지만 원격 세션 해제는 확인되지 않았습니다."
      : "端末からログアウトしましたが、リモートセッションの解除は確認できませんでした。"
    : ko
      ? "기기의 로그아웃 완료 여부를 확인하지 못했습니다."
      : "端末でのログアウト完了を確認できませんでした。";
}
