// 파란 머리가 상태바까지 이어져야 해서 공통 Screen 대신 쓴다. 입력이 없는 홈 전용이다.
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useCallback, type ReactElement, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme";

export interface HomeLayoutProps {
  band: ReactNode;
  /** 머리에 겹쳐 올라온다. */
  children: ReactNode;
}

export function HomeLayout({ band, children }: HomeLayoutProps): ReactElement {
  // 파란 배경에서는 상태바 글자가 흰색이어야 한다. 다른 화면으로 가면 되돌린다.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("auto");
    }, []),
  );
  return (
    // 아래 여백은 탭 바가 처리한다.
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        // 당겼을 때 머리 위아래로 틈이 보이지 않게 한다.
        bounces={false}
        overScrollMode="never"
      >
        {band}
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.brand },
  scroll: { backgroundColor: theme.color.surface },
  content: { flexGrow: 1 },
  body: {
    gap: theme.space.lg,
    marginTop: -theme.space.group,
    paddingHorizontal: theme.space.screen,
    paddingBottom: theme.space.xl,
  },
});
