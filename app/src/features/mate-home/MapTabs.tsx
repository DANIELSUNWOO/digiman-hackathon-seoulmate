// M-10 "공개 중 / 만드는 중" 탭. 공통 Chip은 테두리가 있어 모양이 달라 따로 둔다.
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { useFontFamily } from "../../ui";
import { strings } from "./strings";

export type MapTab = "published" | "draft";

export interface MapTabsProps {
  selected: MapTab;
  counts: Record<MapTab, number>;
  onSelect: (tab: MapTab) => void;
}

const HEIGHT = 34;
const SLOP = (theme.size.touchMin - HEIGHT) / 2;

export function MapTabs({
  selected,
  counts,
  onSelect,
}: MapTabsProps): ReactElement {
  return (
    <View style={styles.tabs}>
      <Tab
        label={strings.published}
        count={counts.published}
        selected={selected === "published"}
        onPress={() => onSelect("published")}
      />
      <Tab
        label={strings.drafting}
        count={counts.draft}
        selected={selected === "draft"}
        onPress={() => onSelect("draft")}
      />
    </View>
  );
}

interface TabProps {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}

function Tab({ label, count, selected, onPress }: TabProps): ReactElement {
  const fontFamily = useFontFamily(selected ? "semibold" : "medium", "ko");
  const bold = useFontFamily("bold", "ko");
  const color = selected ? styles.onText : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={{ top: SLOP, bottom: SLOP }}
      onPress={onPress}
      style={[styles.tab, selected && styles.on]}
    >
      <Text style={[styles.text, color, { fontFamily }]}>
        {`${label} `}
        <Text style={{ fontFamily: bold }}>{count}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: theme.space.sm },
  tab: {
    height: HEIGHT,
    justifyContent: "center",
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
  },
  on: { backgroundColor: theme.color.brandDeep },
  text: {
    fontSize: theme.typography.chip.fontSize,
    lineHeight: theme.typography.chip.lineHeight,
    color: theme.color.labelNeutral,
  },
  onText: { color: theme.color.surface },
});
