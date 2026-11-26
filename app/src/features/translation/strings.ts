import type { ViewerLang } from "./types";

// 일본어 문구는 검수 전이다.
export const strings: Record<
  ViewerLang,
  { aiLabel: string; showOriginal: string; showTranslation: string }
> = {
  ko: {
    aiLabel: "AI 번역",
    showOriginal: "원문 보기",
    showTranslation: "번역 보기",
  },
  ja: {
    aiLabel: "AI翻訳",
    showOriginal: "原文を見る",
    showTranslation: "翻訳を見る",
  },
};
