import type { NotificationLang } from "./types";

export interface NotificationStrings {
  title: string;
  back: string;
  empty: string;
  loading: string;
  retry: string;
  more: string;
  readAll: string;
  unread: string;
  errorNetwork: string;
  errorSession: string;
  errorLoad: string;
  errorAction: string;
}

// 일본어 문구는 검수 전이다. 알림 본문은 서버가 만들어 보낸다.
export const strings: Record<NotificationLang, NotificationStrings> = {
  ko: {
    title: "알림",
    back: "뒤로",
    empty: "아직 알림이 없어요",
    loading: "불러오는 중",
    retry: "다시 시도",
    more: "더 보기",
    readAll: "모두 읽음",
    unread: "안 읽음",
    errorNetwork: "네트워크 연결을 확인해 주세요",
    errorSession: "다시 로그인해 주세요",
    errorLoad: "알림을 불러오지 못했어요",
    errorAction: "처리하지 못했어요. 잠시 후 다시 시도해 주세요",
  },
  ja: {
    title: "お知らせ",
    back: "戻る",
    empty: "お知らせはまだありません",
    loading: "読み込み中",
    retry: "再試行",
    more: "もっと見る",
    readAll: "すべて既読にする",
    unread: "未読",
    errorNetwork: "ネットワーク接続を確認してください",
    errorSession: "もう一度ログインしてください",
    errorLoad: "お知らせを読み込めませんでした",
    errorAction: "処理できませんでした。しばらくしてから再度お試しください",
  },
};
