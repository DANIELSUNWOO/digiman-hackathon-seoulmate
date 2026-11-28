import type { ViewerLang } from "../translation";

export interface AlbumStrings {
  title: string;
  back: string;
  loading: string;
  retry: string;
  withPartner: (nickname: string) => string;
  spotCount: (count: number) => string;
  coverLabel: string;
  empty: string;
  errorNotFound: string;
  errorForbidden: string;
  errorNetwork: string;
  errorSession: string;
  errorLoad: string;
}

// 일본어 문구는 검수 전이다.
export const strings: Record<ViewerLang, AlbumStrings> = {
  ko: {
    title: "앨범",
    back: "뒤로",
    loading: "불러오는 중",
    retry: "다시 시도",
    withPartner: (nickname) => `${nickname}님과 함께한 여행`,
    spotCount: (count) => `인증한 곳 ${count}곳`,
    coverLabel: "앨범 표지",
    empty: "인증한 곳이 없어요",
    errorNotFound: "아직 앨범이 없어요. 여행이 끝나면 만들어져요",
    errorForbidden: "이 매칭의 앨범은 볼 수 없어요",
    errorNetwork: "네트워크 연결을 확인해 주세요",
    errorSession: "다시 로그인해 주세요",
    errorLoad: "앨범을 불러오지 못했어요",
  },
  ja: {
    title: "アルバム",
    back: "戻る",
    loading: "読み込み中",
    retry: "再試行",
    withPartner: (nickname) => `${nickname}さんとの旅`,
    spotCount: (count) => `チェックインしたスポット ${count}か所`,
    coverLabel: "アルバムの表紙",
    empty: "チェックインしたスポットはありません",
    errorNotFound: "アルバムはまだありません。旅行が終わると作られます",
    errorForbidden: "このマッチのアルバムは表示できません",
    errorNetwork: "ネットワーク接続を確認してください",
    errorSession: "もう一度ログインしてください",
    errorLoad: "アルバムを読み込めませんでした",
  },
};
