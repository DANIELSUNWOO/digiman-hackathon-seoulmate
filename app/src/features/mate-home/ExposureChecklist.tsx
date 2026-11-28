// 지도가 여행자에게 보이기 위한 조건. 실제 노출 여부는 서버의 isPublic을 따른다.
import { CheckCircle, CircleIcon } from "phosphor-react-native";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import { MAP_MIN_SPOTS, MAP_PREVIEW_SPOTS } from "./model";
import { strings } from "./strings";

export interface ExposureChecklistProps {
  spotCount: number;
  previewCount: number;
}

export function ExposureChecklist({
  spotCount,
  previewCount,
}: ExposureChecklistProps): ReactElement {
  return (
    <View style={styles.list}>
      <Label weight="bold" language="ko">
        {strings.exposureSection}
      </Label>
      <Condition
        met={spotCount >= MAP_MIN_SPOTS}
        text={strings.exposureSpots(spotCount, MAP_MIN_SPOTS)}
      />
      <Condition
        met={previewCount === MAP_PREVIEW_SPOTS}
        text={strings.exposurePreviews(previewCount, MAP_PREVIEW_SPOTS)}
      />
    </View>
  );
}

function Condition({
  met,
  text,
}: {
  met: boolean;
  text: string;
}): ReactElement {
  const Icon = met ? CheckCircle : CircleIcon;
  return (
    <View style={styles.row}>
      <View accessibilityLabel={met ? strings.met : strings.unmet}>
        <Icon
          size={theme.size.iconSmall}
          color={met ? theme.color.tealInk : theme.color.muted}
          weight={met ? "fill" : "regular"}
        />
      </View>
      <Label language="ko">{text}</Label>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.space.xs, marginTop: theme.space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: theme.space.sm },
});
