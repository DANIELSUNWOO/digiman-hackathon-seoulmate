import type { ViewerLang } from "../translation";

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
  },
};
