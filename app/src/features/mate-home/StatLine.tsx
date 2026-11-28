// "스팟 7곳 · 미리 공개 2곳"처럼 점으로 나눈 한 줄. 숫자만 강조한다.
import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { useFontFamily } from "../../ui";

export interface Stat {
  before: string;
  value: number;
  after: string;
}

export function StatLine({ stats }: { stats: readonly Stat[] }): ReactElement {
  const regular = useFontFamily("regular", "ko");
  const semibold = useFontFamily("semibold", "ko");
  return (
    <View style={styles.line}>
      {stats.map(({ before, value, after }, index) => (
        <View key={before} style={styles.item}>
          {index > 0 && <Text style={styles.dot}>·</Text>}
          <Text style={[styles.text, { fontFamily: regular }]}>
            {`${before} `}
            <Text style={[styles.value, { fontFamily: semibold }]}>
              {value}
            </Text>
            {after}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", flexWrap: "wrap" },
  item: { flexDirection: "row", alignItems: "center" },
  dot: {
    paddingHorizontal: theme.space.sm,
    color: theme.color.labelAssist,
  },
  text: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.color.labelDesc,
  },
  value: { color: theme.color.labelNormal },
});
