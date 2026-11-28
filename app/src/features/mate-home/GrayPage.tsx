// 프로토타입 v9의 지도 화면 틀: 회색 배경에 위에 고정한 머리.
// 공통 Screen은 흰 배경이고 머리를 고정할 수 없어 대신 쓴다.
import type { ReactElement, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { theme } from "../../theme";

export interface GrayPageProps {
  header: ReactNode;
  /** 탭 안의 화면은 아래 여백을 탭 바가 처리하므로 bottom을 뺀다. */
  edges: readonly Edge[];
  children: ReactNode;
}

export function GrayPage({
  header,
  edges,
  children,
}: GrayPageProps): ReactElement {
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <View>{header}</View>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface2 },
  content: {
    flexGrow: 1,
    gap: theme.space.md,
    paddingHorizontal: theme.space.screen,
    paddingTop: theme.space.xs,
    paddingBottom: theme.space.xl,
  },
});
