import type { ViewerLang } from "../translation";

/** "{lead} / {highlight}{tail}" 두 줄 제목. highlight만 강조한다. */
export interface SummaryTitle {
  lead: string;
  highlight: string;
  tail: string;
}

export interface AlbumStrings {
  title: string;
  back: string;
  loading: string;
  retry: string;
  home: string;
  month: (month: number) => string;
  dayUnit: string;
  dayLabel: string;
  spotUnit: string;
  spotLabel: string;
  reviewLabel: string;
  summaryTitle: (partner: string | null, days: number | null) => SummaryTitle;
  summaryBody: (count: number) => string;
  more: string;
  empty: string;
  page: (current: number, total: number) => string;
  errorNotFound: string;
  errorForbidden: string;
  errorNetwork: string;
  errorSession: string;
  errorLoad: string;
}

// 문구는 프로토타입 v9의 T-31 · M-40을 따른다. 상태·오류 문구는 검수 전이다.
export const strings: Record<ViewerLang, AlbumStrings> = {
  ko: {
    title: "앨범",
    back: "뒤로",
    loading: "불러오는 중",
    retry: "다시 시도",
    home: "홈으로",
    month: (month) => `${month}월`,
    dayUnit: "일",
    dayLabel: "여행",
    spotUnit: "곳",
    spotLabel: "인증 스팟",
    reviewLabel: "여행자의 한마디",
    summaryTitle: (partner, days) => ({
      lead: partner ? `${partner}님과 함께한` : "함께한",
      highlight: "서울",
      tail: days ? `의 ${days}일` : " 여행",
    }),
    summaryBody: (count) =>
      `비밀지도에서 ${count}곳을 다녀가고 사진과 한마디를 남겼어요.`,
    more: "자세히 보기",
    empty: "인증한 곳이 없어요",
    page: (current, total) => `${current} / ${total}`,
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
    home: "ホームへ",
    month: (month) => `${month}月`,
    dayUnit: "日間",
    dayLabel: "旅行",
    spotUnit: "か所",
    spotLabel: "チェックイン",
    reviewLabel: "ひとこと",
    summaryTitle: (partner, days) => ({
      lead: partner ? `${partner}さんと歩いた` : "歩いた",
      highlight: "ソウル",
      tail: days ? `の${days}日間` : "の旅",
    }),
    summaryBody: (count) =>
      `秘密の地図から${count}か所を訪ねて、写真とひとことを残しました。`,
    more: "詳しく見る",
    empty: "チェックインしたスポットはありません",
    page: (current, total) => `${current} / ${total}`,
    errorNotFound: "アルバムはまだありません。旅行が終わると作られます",
    errorForbidden: "このマッチのアルバムは表示できません",
    errorNetwork: "ネットワーク接続を確認してください",
    errorSession: "もう一度ログインしてください",
    errorLoad: "アルバムを読み込めませんでした",
  },
};
