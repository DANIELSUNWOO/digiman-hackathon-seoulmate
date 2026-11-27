import type { ViewerLang } from "../translation";
import type { ReactionType } from "./types";

export interface VisitStrings {
  title: string;
  back: string;
  empty: string;
  loading: string;
  retry: string;
  photoFailed: string;
  photoLabel: (spotName: string) => string;
  errorNetwork: string;
  errorSession: string;
  errorForbidden: string;
  errorLoad: string;
  errorRefresh: string;
  errorAction: string;
  errorBlocked: string;
  errorMissing: string;
  reactions: Record<ReactionType, string>;
  reactionReceived: (label: string) => string;
  commentPlaceholder: string;
  commentSubmit: string;
  commentSending: string;
  report: string;
}

// 일본어 문구는 검수 전이다. 스팟 이름은 서버가 한국어로 내려준다.
export const strings: Record<ViewerLang, VisitStrings> = {
  ko: {
    title: "방문 기록",
    back: "뒤로",
    empty: "아직 방문 기록이 없어요",
    loading: "불러오는 중",
    retry: "다시 시도",
    photoFailed: "사진을 불러오지 못했어요",
    photoLabel: (spotName) => `${spotName} 방문 사진`,
    errorNetwork: "네트워크 연결을 확인해 주세요",
    errorSession: "다시 로그인해 주세요",
    errorForbidden: "이 매칭의 방문 기록은 볼 수 없어요",
    errorLoad: "방문 기록을 불러오지 못했어요",
    errorRefresh: "새 방문 기록을 확인하지 못했어요",
    errorAction: "처리하지 못했어요. 잠시 후 다시 시도해 주세요",
    errorBlocked: "지금은 이 매칭에 반응을 남길 수 없어요",
    errorMissing: "방문 기록을 찾을 수 없어요",
    reactions: { LIKE: "좋아요", LAUGH: "웃음", CHEER: "응원" },
    reactionReceived: (label) => `메이트의 리액션: ${label}`,
    commentPlaceholder: "댓글을 남겨 보세요",
    commentSubmit: "댓글 남기기",
    commentSending: "남기는 중",
    report: "신고",
  },
  ja: {
    title: "訪問の記録",
    back: "戻る",
    empty: "訪問の記録はまだありません",
    loading: "読み込み中",
    retry: "再試行",
    photoFailed: "写真を読み込めませんでした",
    photoLabel: (spotName) => `${spotName}の訪問写真`,
    errorNetwork: "ネットワーク接続を確認してください",
    errorSession: "もう一度ログインしてください",
    errorForbidden: "このマッチの訪問の記録は表示できません",
    errorLoad: "訪問の記録を読み込めませんでした",
    errorRefresh: "新しい訪問の記録を確認できませんでした",
    errorAction: "処理できませんでした。しばらくしてからもう一度お試しください",
    errorBlocked: "現在、このマッチには反応を残せません",
    errorMissing: "訪問の記録が見つかりません",
    reactions: { LIKE: "いいね", LAUGH: "笑い", CHEER: "応援" },
    reactionReceived: (label) => `メイトのリアクション：${label}`,
    commentPlaceholder: "コメントを残す",
    commentSubmit: "コメントする",
    commentSending: "送信中",
    report: "通報",
  },
};
