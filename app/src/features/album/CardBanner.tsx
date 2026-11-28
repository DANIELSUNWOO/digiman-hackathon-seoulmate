// 방문 카드 위의 블루 띠: 달력 타일, 스팟 이름, 서울 장식.
import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { theme } from "../../theme";
import { useFontFamily } from "../../ui";
import type { ViewerLang } from "../translation";
import { calendarDay } from "./albumModel";
import { strings } from "./strings";

export interface CardBannerProps {
  spotName: string;
  verifiedAt: string;
  lang: ViewerLang;
}

export function CardBanner({
  spotName,
  verifiedAt,
  lang,
}: CardBannerProps): ReactElement {
  const { month, day } = calendarDay(verifiedAt);
  const monthFont = useFontFamily("bold", lang);
  // 스팟 이름은 한국어다.
  const nameFont = useFontFamily("bold", "ko");
  return (
    <View style={styles.banner}>
      <Skyline />
      <View style={styles.tile}>
        <Text style={[styles.month, { fontFamily: monthFont }]}>
          {strings[lang].month(month)}
        </Text>
        <Text style={[styles.day, { fontFamily: monthFont }]}>{day}</Text>
      </View>
      <Text style={[styles.name, { fontFamily: nameFont }]}>{spotName}</Text>
    </View>
  );
}

function Skyline(): ReactElement {
  return (
    <View style={styles.skyline} pointerEvents="none" aria-hidden>
      <Svg width="100%" height="100%" viewBox="0 0 160 70">
        <Circle cx={139} cy={6} r={6} fill={theme.color.accent} />
        <Path
          d="M0 70C16 70 28 55 58 54Q84 42 112 50Q136 44 160 50V70Z"
          fill={theme.color.brandDis}
          opacity={0.5}
        />
        <Rect
          x={58}
          y={30}
          width={12}
          height={40}
          fill={theme.color.brandTint}
        />
        <Rect
          x={72}
          y={40}
          width={10}
          height={30}
          fill={theme.color.brandTint}
        />
        <Path d="M120 20l5 50h-10z" fill={theme.color.brandTint} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
    minHeight: 84,
    padding: theme.space.lg,
    backgroundColor: theme.color.brand,
  },
  skyline: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "44%",
    aspectRatio: 160 / 70,
  },
  tile: {
    width: 52,
    overflow: "hidden",
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface,
  },
  month: {
    textAlign: "center",
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.surface,
    backgroundColor: theme.color.labelNeutral,
  },
  day: {
    textAlign: "center",
    fontSize: theme.typography.statNumber.fontSize,
    lineHeight: theme.typography.statNumber.lineHeight,
    color: theme.color.labelNormal,
  },
  name: {
    flex: 1,
    fontSize: theme.typography.appbar.fontSize,
    lineHeight: theme.typography.appbar.lineHeight,
    color: theme.color.surface,
  },
});
