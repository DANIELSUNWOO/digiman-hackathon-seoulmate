// "여행 중", "공개 중" 같은 초록 상태 라벨.
import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { useFontFamily } from "../../ui";

export function StatusPill({ label }: { label: string }): ReactElement {
  const fontFamily = useFontFamily("bold", "ko");
  return (
    <View style={styles.pill}>
      <Text style={[styles.text, { fontFamily }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.status,
    backgroundColor: theme.color.positiveSoft,
  },
  text: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.positive,
  },
});
