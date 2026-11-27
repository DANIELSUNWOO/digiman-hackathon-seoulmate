import type { Translated, ViewerLang } from "./types";

/** 읽는 사람에게 보여 줄 번역문. 같은 언어이거나 번역이 없으면 null이고 원문을 보여 준다. */
export function readableTranslation(
  { translated, sourceLang }: Translated,
  viewerLang: ViewerLang,
): string | null {
  if (sourceLang === viewerLang || !translated?.trim()) return null;
  return translated;
}
