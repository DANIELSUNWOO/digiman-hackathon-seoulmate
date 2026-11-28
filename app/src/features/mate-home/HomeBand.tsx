// M-20 파란 머리: 로고, 알림 종, 상태에 맞는 인사말.
import type { ReactElement, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LogoMark } from "../../brandAssets";
import { theme } from "../../theme";
import { useFontFamily } from "../../ui";
import { BellColorContext } from "../notifications";
import { strings } from "./strings";

export interface Greeting {
  title: string;
  subtitle: string;
}

export interface HomeBandProps {
  /** 홈을 불러오기 전에는 null */
  greeting: Greeting | null;
  /** 로고 오른쪽에 둘 것 (알림 종) */
  right?: ReactNode;
}

export function HomeBand({ greeting, right }: HomeBandProps): ReactElement {
  const bold = useFontFamily("bold", "ko");
  const regular = useFontFamily("regular", "ko");
  return (
    <View style={styles.band}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <LogoMark size={22} variant="white" />
          <Text style={styles.wordmark}>{strings.appName}</Text>
        </View>
        <BellColorContext.Provider value={theme.color.surface}>
          {right}
        </BellColorContext.Provider>
      </View>
      {greeting && (
        <>
          <Text
            accessibilityRole="header"
            style={[styles.title, { fontFamily: bold }]}
          >
            {greeting.title}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: regular }]}>
            {greeting.subtitle}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    gap: theme.space.sm,
    paddingHorizontal: theme.space.screen,
    paddingTop: theme.space.sm,
    // 아래 첫 카드가 겹쳐 올라올 자리
    paddingBottom: theme.space.group + theme.space.lg,
    backgroundColor: theme.color.brand,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: theme.size.touchMin,
  },
  logo: { flexDirection: "row", alignItems: "center", gap: theme.space.xs },
  wordmark: {
    fontFamily: "Cafe24Ssurround",
    fontSize: theme.typography.wordmarkKr.fontSize,
    lineHeight: theme.typography.wordmarkKr.lineHeight,
    color: theme.color.surface,
  },
  title: {
    fontSize: theme.typography.greet.fontSize,
    lineHeight: theme.typography.greet.lineHeight,
    letterSpacing: theme.typography.greet.letterSpacing,
    color: theme.color.surface,
  },
  subtitle: {
    fontSize: theme.typography.desc.fontSize,
    lineHeight: theme.typography.desc.lineHeight,
    color: theme.color.surface,
  },
});
