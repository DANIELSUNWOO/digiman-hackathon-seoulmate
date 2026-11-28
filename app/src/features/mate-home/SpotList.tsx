// M-10a의 내 스팟 목록: 한 상자 안에 사진, 이름, 내가 쓴 소개와 추천 이유.
import { Lightbulb } from "phosphor-react-native";
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { Label, useFontFamily } from "../../ui";
import { FlatCard } from "./FlatCard";
import { SpotThumb } from "./SpotThumb";
import { StatusPill } from "./StatusPill";
import { strings } from "./strings";
import type { MapSpot } from "./types";

export interface SpotListProps {
  spots: readonly MapSpot[];
  onOpenSpot: (spotId: number) => void;
}

export function SpotList({ spots, onOpenSpot }: SpotListProps): ReactElement {
  return (
    <FlatCard style={styles.box}>
      {spots.length === 0 && (
        <View style={styles.row}>
          <Label tone="desc" language="ko">
            {strings.spotEmpty}
          </Label>
        </View>
      )}
      {spots.map((spot, index) => (
        // 디자인에는 없지만 스팟을 고치는 길이 여기뿐이라 누를 수 있게 둔다.
        <Pressable
          key={spot.spotId}
          accessibilityRole="button"
          onPress={() => onOpenSpot(spot.spotId)}
          style={[styles.row, index > 0 && styles.divider]}
        >
          <SpotThumb
            url={spot.photos[0]}
            order={index + 1}
            isPreview={spot.isPreview}
          />
          <SpotText spot={spot} />
        </Pressable>
      ))}
    </FlatCard>
  );
}

function SpotText({ spot }: { spot: MapSpot }): ReactElement {
  const semibold = useFontFamily("semibold", "ko");
  const medium = useFontFamily("medium", "ko");
  const regular = useFontFamily("regular", "ko");
  const why = spot.reason?.original;
  return (
    <View style={styles.body}>
      <View style={styles.nameRow}>
        <Text numberOfLines={1} style={[styles.name, { fontFamily: semibold }]}>
          {spot.name}
        </Text>
        {spot.isPreview && (
          <StatusPill label={strings.spotPublic} tone="brand" />
        )}
      </View>
      <Text numberOfLines={2} style={[styles.intro, { fontFamily: medium }]}>
        {spot.review?.original || strings.introEmpty}
      </Text>
      {!!why && (
        <View style={styles.whyRow}>
          <Lightbulb
            size={theme.size.iconInline}
            color={theme.color.brandDeep}
          />
          <Text style={[styles.why, { fontFamily: regular }]}>{why}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 0,
    borderRadius: theme.radius.card,
    paddingVertical: theme.space.sm,
  },
  row: {
    flexDirection: "row",
    gap: theme.space.md,
    paddingVertical: theme.space.md,
  },
  divider: { borderTopWidth: 1, borderTopColor: theme.color.lineAlt },
  body: { flex: 1, gap: theme.space.xs },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
  },
  name: {
    flex: 1,
    fontSize: theme.typography.body2.fontSize,
    lineHeight: theme.typography.body2.lineHeight,
    color: theme.color.labelNormal,
  },
  intro: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.color.labelDesc,
  },
  whyRow: { flexDirection: "row", gap: theme.space.xs },
  why: {
    flex: 1,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.color.labelAlt,
  },
});
