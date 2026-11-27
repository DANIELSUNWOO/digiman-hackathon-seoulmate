// 여행자는 메이트를, 메이트는 여행자를 평가한다. 역할이 화면 언어도 정한다.
import type { ViewerLang } from "../translation";
import type { ReviewerRole } from "./types";

export interface ReviewStrings {
  lang: ViewerLang;
  title: string;
  back: string;
  loading: string;
  retry: string;
  question: string;
  ratingLabel: string;
  star: (rating: number) => string;
  ratingHint: string;
  commentLabel: string;
  commentPlaceholder: string;
  noEdit: string;
  submit: string;
  sent: string;
  mineTitle: string;
  partnerTitle: string;
  noContent: string;
  errorLoad: string;
  errorSubmit: string;
  errorNetwork: string;
  errorSession: string;
  errorForbidden: string;
  errorNotCompleted: string;
  errorBlocked: string;
  errorAlready: string;
  errorInput: string;
}

const traveler: ReviewStrings = {
  lang: "ja",
  title: "メイトのレビュー",
  back: "戻る",
  loading: "読み込み中",
  retry: "もう一度試す",
  question: "メイトのコースを巡る旅はいかがでしたか？",
  ratingLabel: "評価（必須）",
  star: (rating) => `星${rating}つ`,
  ratingHint: "星を選ぶと送れます。",
  commentLabel: "コメント（任意）",
  commentPlaceholder: "メイトに伝えたいことを書いてください",
  noEdit: "送ったレビューは修正できません。",
  submit: "レビューを送る",
  sent: "レビューを送りました。ありがとうございました",
  mineTitle: "あなたが書いたレビュー",
  partnerTitle: "メイトからのレビュー",
  noContent: "コメントはありません。",
  errorLoad: "レビューを読み込めませんでした。",
  errorSubmit: "レビューを送れませんでした。",
  errorNetwork: "通信できませんでした。接続を確認してください。",
  errorSession: "ログインの期限が切れました。もう一度ログインしてください。",
  errorForbidden: "このマッチングのレビューは利用できません。",
  errorNotCompleted: "旅行が終わってからレビューを書けます。",
  errorBlocked: "このマッチングではレビューを書けません。",
  errorAlready: "レビューはすでに送っています。",
  errorInput: "入力内容を確認してください。",
};

const mate: ReviewStrings = {
  lang: "ko",
  title: "여행자 후기",
  back: "뒤로",
  loading: "불러오는 중",
  retry: "다시 시도",
  question: "내 코스를 다녀간 여행자는 어땠나요?",
  ratingLabel: "별점 (필수)",
  star: (rating) => `별점 ${rating}점`,
  ratingHint: "별점을 고르면 보낼 수 있어요.",
  commentLabel: "후기 (선택)",
  commentPlaceholder: "여행자에게 전하고 싶은 말을 적어 주세요",
  noEdit: "보낸 후기는 고칠 수 없어요.",
  submit: "후기 보내기",
  sent: "후기를 보냈어요",
  mineTitle: "내가 쓴 후기",
  partnerTitle: "여행자가 남긴 후기",
  noContent: "남긴 글은 없어요.",
  errorLoad: "후기를 불러오지 못했어요.",
  errorSubmit: "후기를 보내지 못했어요.",
  errorNetwork: "연결할 수 없어요. 네트워크를 확인해 주세요.",
  errorSession: "로그인이 만료됐어요. 다시 로그인해 주세요.",
  errorForbidden: "이 매칭의 후기는 이용할 수 없어요.",
  errorNotCompleted: "여행이 끝난 뒤에 후기를 쓸 수 있어요.",
  errorBlocked: "이 매칭에는 후기를 남길 수 없어요.",
  errorAlready: "이미 후기를 보냈어요.",
  errorInput: "입력한 내용을 확인해 주세요.",
};

export const reviewStrings: Record<ReviewerRole, ReviewStrings> = {
  TRAVELER: traveler,
  MATE: mate,
};
