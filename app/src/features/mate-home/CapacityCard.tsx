// M-20 동시에 함께하는 여행자 수.
import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { Card, Label, useFontFamily } from "../../ui";
import { ProgressBar } from "./ProgressBar";
import { strings } from "./strings";

export interface CapacityCardProps {
  active: number;
  max: number;
}

export function CapacityCard({ active, max }: CapacityCardProps): ReactElement {
  const fontFamily = useFontFamily("bold", "ko");
  return (
    <Card>
      <View style={styles.body}>
        <View style={styles.row}>
          <Label weight="bold" language="ko">
            {strings.traveling}
          </Label>
          <View style={styles.count}>
            <Text style={[styles.number, { fontFamily }]}>{active}</Text>
            <Label weight="bold" tone="assist" language="ko">
              {`/${max}`}
            </Label>
          </View>
        </View>
        <ProgressBar value={active} max={max} />
        <Label variant="caption" tone="desc" language="ko">
          {strings.capacityHint(max)}
        </Label>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  count: { flexDirection: "row", alignItems: "baseline" },
  number: {
    fontSize: theme.typography.statNumber.fontSize,
    lineHeight: theme.typography.statNumber.lineHeight,
    color: theme.color.labelNormal,
  },
});
