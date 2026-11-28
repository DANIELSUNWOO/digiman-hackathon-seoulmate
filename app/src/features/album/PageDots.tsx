import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import type { ViewerLang } from "../translation";
import { strings } from "./strings";

// 이보다 많으면 점이 알아보기 어려워 숫자로 보여 준다.
const MAX_DOTS = 10;

export interface PageDotsProps {
  count: number;
  index: number;
  lang: ViewerLang;
}

export function PageDots({
  count,
  index,
  lang,
}: PageDotsProps): ReactElement | null {
  if (count <= 1) return null;
  const position = strings[lang].page(index + 1, count);
  if (count > MAX_DOTS)
    return (
      <Label center language={lang} variant="caption" tone="desc">
        {position}
      </Label>
    );
  return (
    <View accessible accessibilityLabel={position} style={styles.row}>
      {Array.from({ length: count }, (_, page) => (
        <View key={page} style={[styles.dot, page === index && styles.on]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.labelDisable,
  },
  on: { width: 18, backgroundColor: theme.color.brand },
});
