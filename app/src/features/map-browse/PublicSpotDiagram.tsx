import React from "react";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { View } from "react-native";
import type { PreviewSpot } from "./model";
import { theme } from "../../theme";
import { Label } from "../../ui";
export function projectPublicSpots(spots: PreviewSpot[]) {
  if (!spots.length) return [];
  const lats = spots.map((s) => s.lat),
    lngs = spots.map((s) => s.lng);
  const minLat = Math.min(...lats),
    maxLat = Math.max(...lats),
    minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs);
  return spots.map((spot, index) => ({
    spot,
    index,
    x:
      maxLng === minLng
        ? 150
        : 30 + ((spot.lng - minLng) / (maxLng - minLng)) * 240,
    y:
      maxLat === minLat
        ? 80
        : 130 - ((spot.lat - minLat) / (maxLat - minLat)) * 100,
  }));
}
export function PublicSpotDiagram({ spots }: { spots: PreviewSpot[] }) {
  const points = projectPublicSpots(spots);
  return (
    <View
      style={{
        backgroundColor: theme.color.surface2,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <Label tone="desc">公開スポットの位置関係（地図背景なし）</Label>
      <Svg viewBox="0 0 300 160" height={160} width="100%">
        {points.map(({ spot, index, x, y }) => (
          <React.Fragment key={spot.spotId}>
            <Circle cx={x} cy={y} r={15} fill={theme.color.brandDeep} />
            <SvgText
              x={x}
              y={y + 5}
              textAnchor="middle"
              fontSize="14"
              fill="white"
            >
              {index + 1}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
