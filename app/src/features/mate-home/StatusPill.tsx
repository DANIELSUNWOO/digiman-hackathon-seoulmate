// "여행 중", "공개 중", "공개" 같은 상태 라벨.
import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { useFontFamily } from "../../ui";

export type PillTone = "positive" | "neutral" | "brand";

export interface StatusPillProps {
  label: string;
  tone?: PillTone;
}

export function StatusPill({
  label,
  tone = "positive",
}: StatusPillProps): ReactElement {
  const fontFamily = useFontFamily("bold", "ko");
  return (
    <View style={[styles.pill, backgrounds[tone]]}>
      <Text style={[styles.text, texts[tone], { fontFamily }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.pill,
  },
  text: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
  },
});

const backgrounds = StyleSheet.create({
  positive: { backgroundColor: theme.color.positiveSoft },
  neutral: { backgroundColor: theme.color.fillNormal },
  brand: { backgroundColor: theme.color.brandSoft },
});

const texts = StyleSheet.create({
  positive: { color: theme.color.positive },
  neutral: { color: theme.color.labelDesc },
  brand: { color: theme.color.brandDeep },
});
