// M-10a 머리 아래: 숫자와 공개 상태, 한 줄 소개, 공개 전 안내.
import { Info } from "phosphor-react-native";
import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { useFontFamily } from "../../ui";
import { StatusPill } from "./StatusPill";
import { strings } from "./strings";
import type { MapDetail } from "./types";

export interface DetailSummaryProps {
  map: MapDetail;
  /** 서버가 아직 주지 않으면 없다. */
  selectedCount: number | undefined;
}

export function DetailSummary({
  map,
  selectedCount,
}: DetailSummaryProps): ReactElement {
  const regular = useFontFamily("regular", "ko");
  const caption = map.caption?.original;
  const previews = map.spots.filter((spot) => spot.isPreview).length;
  const counts = [
    { ...strings.tagSpots, value: map.spots.length },
    { ...strings.tagPreviews, value: previews },
    ...(selectedCount === undefined
      ? []
      : [{ ...strings.tagSelected, value: selectedCount }]),
  ];
  return (
    <View style={styles.summary}>
      <View style={styles.statusRow}>
        <Text style={[styles.counts, { fontFamily: regular }]}>
          {counts
            .map(({ before, value, after }) => `${before} ${value}${after}`)
            .join(" · ")}
        </Text>
        <StatusPill
          label={map.isPublic ? strings.published : strings.unpublished}
          tone={map.isPublic ? "positive" : "neutral"}
        />
      </View>
      {!!caption && (
        <Text style={[styles.caption, { fontFamily: regular }]}>{caption}</Text>
      )}
      {!map.isPublic && <HiddenNotice />}
    </View>
  );
}

function HiddenNotice(): ReactElement {
  const bold = useFontFamily("bold", "ko");
  const regular = useFontFamily("regular", "ko");
  return (
    <View style={styles.notice}>
      <Info size={theme.size.iconSmall} color={theme.color.brandDeep} />
      <View style={styles.noticeBody}>
        <Text style={[styles.noticeText, { fontFamily: bold }]}>
          {strings.hiddenTitle}
        </Text>
        <Text style={[styles.noticeText, { fontFamily: regular }]}>
          {strings.hiddenBody}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: theme.space.sm },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
  },
  counts: {
    flex: 1,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.color.labelDesc,
  },
  caption: {
    fontSize: theme.typography.body1.fontSize,
    lineHeight: theme.typography.body1.lineHeight,
    color: theme.color.labelNeutral,
  },
  notice: {
    flexDirection: "row",
    gap: theme.space.md,
    padding: theme.space.lg,
  },
  noticeBody: { flex: 1 },
  noticeText: {
    fontSize: theme.typography.desc.fontSize,
    lineHeight: theme.typography.desc.lineHeight,
    color: theme.color.labelNormal,
  },
});
