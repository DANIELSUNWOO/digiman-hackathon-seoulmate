// 사용자가 쓴 글을 읽는 사람의 언어로 보여 준다 (F-35). 번역 호출은 서버가 한다.
import { useState, type ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import { readableTranslation } from "./model";
import { strings } from "./strings";
import type { Translated, ViewerLang } from "./types";

export type TranslatedTextProps = {
  value: Translated;
  viewerLang: ViewerLang;
};

type TranslationBarProps = {
  viewerLang: ViewerLang;
  showOriginal: boolean;
  onToggle: () => void;
};

export function TranslatedText({
  value,
  viewerLang,
}: TranslatedTextProps): ReactElement {
  // 어느 글의 원문을 펼쳤는지 기억한다. 목록에서 value가 바뀌면 번역문부터 다시 보인다.
  const [openedOriginal, setOpenedOriginal] = useState<string | null>(null);
  const translation = readableTranslation(value, viewerLang);
  // 글꼴은 화면의 역할이 아니라 지금 보이는 글의 언어를 따른다.
  const originalLang = value.sourceLang ?? viewerLang;

  if (translation === null)
    return <Label language={originalLang}>{value.original}</Label>;

  const showOriginal = openedOriginal === value.original;
  return (
    <View>
      <Label language={showOriginal ? originalLang : viewerLang}>
        {showOriginal ? value.original : translation}
      </Label>
      <TranslationBar
        viewerLang={viewerLang}
        showOriginal={showOriginal}
        onToggle={() => setOpenedOriginal(showOriginal ? null : value.original)}
      />
    </View>
  );
}

function TranslationBar({
  viewerLang,
  showOriginal,
  onToggle,
}: TranslationBarProps) {
  const text = strings[viewerLang];
  const fontFamily = `NotoSans${viewerLang === "ko" ? "KR" : "JP"}_400Regular`;
  return (
    <View style={styles.bar}>
      {!showOriginal && (
        <Text style={[styles.meta, { fontFamily }]}>{text.aiLabel}</Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={styles.toggle}
      >
        <Text style={[styles.meta, styles.link, { fontFamily }]}>
          {showOriginal ? text.showTranslation : text.showOriginal}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: theme.space.md },
  toggle: { minHeight: theme.size.touchMin, justifyContent: "center" },
  meta: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.color.muted,
  },
  link: { textDecorationLine: "underline" },
});
