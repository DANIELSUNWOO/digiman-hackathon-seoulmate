// 캐러셀 마지막 장: 여행 요약.
import type { ReactElement } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { theme } from "../../theme";
import { Label, TextLink, useFontFamily } from "../../ui";
import type { ViewerLang } from "../translation";
import { strings } from "./strings";

export interface SummaryCardProps {
  lang: ViewerLang;
  period: string | null;
  partnerName: string | null;
  days: number | null;
  spotCount: number;
  onOpenVisits: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SummaryCard({
  lang,
  period,
  partnerName,
  days,
  spotCount,
  onOpenVisits,
  style,
}: SummaryCardProps): ReactElement {
  const text = strings[lang];
  const { lead, highlight, tail } = text.summaryTitle(partnerName, days);
  const fontFamily = useFontFamily("bold", lang);
  return (
    <View style={[styles.card, style]}>
      {period && (
        <Label language={lang} variant="caption" tone="desc">
          {period}
        </Label>
      )}
      <Text style={[styles.title, { fontFamily }]}>
        {`${lead}\n`}
        <Text style={styles.highlight}>{highlight}</Text>
        {tail}
      </Text>
      <Label language={lang} variant="body2" tone="neutral">
        {spotCount > 0 ? text.summaryBody(spotCount) : text.empty}
      </Label>
      <View style={styles.divider} />
      <TextLink
        label={`${text.more} ›`}
        variant="quiet"
        language={lang}
        onPress={onOpenVisits}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    justifyContent: "center",
    gap: theme.space.md,
    padding: theme.space.xl,
    borderRadius: theme.radius.sheet,
    backgroundColor: theme.color.surface2,
  },
  title: {
    fontSize: theme.typography.greet.fontSize,
    lineHeight: theme.typography.greet.lineHeight,
    color: theme.color.labelNormal,
  },
  highlight: { color: theme.color.brandDeep },
  divider: {
    height: 1,
    marginTop: theme.space.sm,
    backgroundColor: theme.color.lineNormal,
  },
});
