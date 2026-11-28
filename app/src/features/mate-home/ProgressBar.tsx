import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";

export interface ProgressBarProps {
  value: number;
  max: number;
}

export function ProgressBar({ value, max }: ProgressBarProps): ReactElement {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: value }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: theme.space.sm,
    overflow: "hidden",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.fillNormal,
  },
  fill: {
    height: "100%",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
  },
});
