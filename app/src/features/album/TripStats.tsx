// 여행 일수, 인증한 곳 수, 함께한 사람.
import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { Label, useFontFamily } from "../../ui";
import type { ViewerLang } from "../translation";
import { Avatar } from "./Avatar";
import { strings } from "./strings";
import type { AlbumMember } from "./types";

export interface TripStatsProps {
  lang: ViewerLang;
  /** 일정을 못 읽으면 null */
  days: number | null;
  spotCount: number;
  partner: AlbumMember | null;
}

export function TripStats({
  lang,
  days,
  spotCount,
  partner,
}: TripStatsProps): ReactElement {
  const text = strings[lang];
  return (
    <View style={styles.row}>
      {days !== null && (
        <Stat
          value={days}
          unit={text.dayUnit}
          label={text.dayLabel}
          lang={lang}
        />
      )}
      <Stat
        value={spotCount}
        unit={text.spotUnit}
        label={text.spotLabel}
        lang={lang}
      />
      {partner && (
        <View style={styles.cell}>
          <Avatar url={partner.profileImageUrl} name={partner.nickname} />
          {/* 상대의 언어: 메이트가 보는 여행자는 일본어, 반대는 한국어. */}
          <Label
            language={lang === "ko" ? "ja" : "ko"}
            variant="caption"
            tone="neutral"
            weight="semibold"
          >
            {partner.nickname}
          </Label>
        </View>
      )}
    </View>
  );
}

interface StatProps {
  value: number;
  unit: string;
  label: string;
  lang: ViewerLang;
}

function Stat({ value, unit, label, lang }: StatProps): ReactElement {
  const fontFamily = useFontFamily("bold", lang);
  return (
    <View style={styles.cell}>
      <View style={styles.value}>
        <Text style={[styles.number, { fontFamily }]}>{value}</Text>
        <Label language={lang} variant="caption" tone="desc">
          {unit}
        </Label>
      </View>
      <Label language={lang} variant="caption" tone="desc">
        {label}
      </Label>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: theme.space.lg,
    borderRadius: theme.radius.sheet,
    backgroundColor: theme.color.surface2,
  },
  cell: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  value: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  number: {
    fontSize: theme.typography.statNumber.fontSize,
    lineHeight: theme.typography.statNumber.lineHeight,
    color: theme.color.labelNormal,
  },
});
