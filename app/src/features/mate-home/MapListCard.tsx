// M-10 지도 카드. 공개 중이면 숫자를, 공개 전이면 남은 조건을 보여 준다.
import { CaretRight } from "phosphor-react-native";
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { useFontFamily } from "../../ui";
import { FlatCard } from "./FlatCard";
import { PublishSteps } from "./PublishSteps";
import { StatLine } from "./StatLine";
import { StatusPill } from "./StatusPill";
import { strings } from "./strings";
import type { MyMap } from "./types";

export interface MapListCardProps {
  map: MyMap;
  onOpen: () => void;
  onAddSpot: () => void;
  onPickPreviews: () => void;
}

export function MapListCard({
  map,
  onOpen,
  onAddSpot,
  onPickPreviews,
}: MapListCardProps): ReactElement {
  return (
    // 카드 안에 버튼이 따로 있어 카드 전체를 누르게 하지 않는다.
    <FlatCard>
      <View style={styles.body}>
        <MapSummary map={map} onOpen={onOpen} />
        {!map.isPublic && (
          <PublishSteps
            spotCount={map.spotCount}
            previewCount={map.previewCount}
            onAddSpot={onAddSpot}
            onPickPreviews={onPickPreviews}
          />
        )}
      </View>
    </FlatCard>
  );
}

function MapSummary({
  map,
  onOpen,
}: Pick<MapListCardProps, "map" | "onOpen">): ReactElement {
  const bold = useFontFamily("bold", "ko");
  const regular = useFontFamily("regular", "ko");
  const caption = map.caption?.original;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={styles.summary}
    >
      <View style={styles.titleRow}>
        <Text numberOfLines={1} style={[styles.title, { fontFamily: bold }]}>
          {map.title}
        </Text>
        {map.isPublic && <StatusPill label={strings.published} />}
        <CaretRight
          size={theme.size.iconInline}
          color={theme.color.iconChevron}
        />
      </View>
      {!!caption && (
        <Text
          numberOfLines={1}
          style={[styles.caption, { fontFamily: regular }]}
        >
          {caption}
        </Text>
      )}
      {map.isPublic && <MapStats map={map} />}
    </Pressable>
  );
}

function MapStats({ map }: { map: MyMap }): ReactElement {
  const stats = [
    { ...strings.tagSpots, value: map.spotCount },
    { ...strings.tagPreviews, value: map.previewCount },
  ];
  // 서버가 아직 선택 횟수를 주지 않으면 뺀다.
  if (map.selectedCount === undefined) return <StatLine stats={stats} />;
  const selected = { ...strings.tagSelected, value: map.selectedCount };
  return <StatLine stats={[...stats, selected]} />;
}

const styles = StyleSheet.create({
  body: { gap: theme.space.md },
  summary: { gap: theme.space.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.body1.fontSize,
    lineHeight: theme.typography.body1.lineHeight,
    color: theme.color.labelNormal,
  },
  caption: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.color.labelNeutral,
  },
});
