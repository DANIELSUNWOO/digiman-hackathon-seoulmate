// API 명세 v1.7 0-3. 서버의 LocalizedText와 같은 모양이다.
export type ViewerLang = "ko" | "ja";

export type Translated = {
  original: string;
  /** 번역에 실패했거나 아직 번역하지 않으면 null */
  translated: string | null;
  /** 쓴 사람을 알 수 없는 글(탈퇴한 후기 작성자 등)은 null */
  sourceLang: ViewerLang | null;
};
