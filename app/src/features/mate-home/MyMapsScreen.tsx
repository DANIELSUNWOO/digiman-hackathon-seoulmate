// M-10 내 비밀지도: 위에 고정한 제목과 +, 그 아래 지도 목록.
import { Plus } from "phosphor-react-native";
import { useCallback, type ReactElement } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { AppBar } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { LoadError, Loading } from "./LoadStatus";
import { MyMapList, type MyMapListProps } from "./MyMapList";
import { strings } from "./strings";
import { useLoad } from "./useLoad";

export interface MyMapsScreenProps extends Omit<MyMapListProps, "maps"> {
  api?: MateHomeApi;
}

export function MyMapsScreen({
  api = mateHomeApi,
  ...actions
}: MyMapsScreenProps): ReactElement {
  const load = useCallback(() => api.getMyMaps(), [api]);
  const { state, retry } = useLoad(load);

  return (
    // 제목이 스크롤되지 않아야 해서 공통 Screen 대신 쓴다. 아래 여백은 탭 바가 처리한다.
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <View style={styles.header}>
        <AppBar
          title={strings.mapsTitle}
          language="ko"
          right={<AddButton onPress={actions.onCreate} />}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {state.status === "loading" && <Loading />}
        {state.status === "error" && (
          <LoadError error={state.error} onRetry={retry} />
        )}
        {state.status === "ready" && (
          <MyMapList maps={state.data} {...actions} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AddButton({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.addMap}
      onPress={onPress}
      style={styles.add}
    >
      <Plus size={theme.size.icon} color={theme.color.labelNormal} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: {
    paddingHorizontal: theme.space.screen,
    paddingTop: theme.space.sm,
  },
  content: {
    flexGrow: 1,
    gap: theme.space.lg,
    paddingHorizontal: theme.space.screen,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xl,
  },
  add: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
});
