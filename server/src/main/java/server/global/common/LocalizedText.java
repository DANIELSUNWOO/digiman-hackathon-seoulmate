package server.global.common;

/** 명세서 0-3. 사용자가 쓴 글은 원문 + 번역 + 원문 언어로 내려준다. 번역 실패 시 translated = null */
public record LocalizedText(String original, String translated, String sourceLang) {
    public static LocalizedText of(String original, String translated, String sourceLang) {
        if (original == null) return null;
        return new LocalizedText(original, translated, sourceLang);
    }
}
