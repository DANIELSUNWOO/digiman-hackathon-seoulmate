// M-10 내 비밀지도: 위에 고정한 제목과 +, 그 아래 지도 목록.
import { Plus } from "phosphor-react-native";
import { useCallback, type ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { useFontFamily } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { FlatCard } from "./FlatCard";
import { GrayPage } from "./GrayPage";
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
    // 아래 여백은 탭 바가 처리한다.
    <GrayPage
      edges={["top", "left", "right"]}
      header={<Header onAdd={actions.onCreate} />}
    >
      {state.status === "loading" && <Loading />}
      {state.status === "error" && (
        <FlatCard>
          <LoadError error={state.error} onRetry={retry} />
        </FlatCard>
      )}
      {state.status === "ready" && <MyMapList maps={state.data} {...actions} />}
    </GrayPage>
  );
}

function Header({ onAdd }: { onAdd: () => void }): ReactElement {
  const fontFamily = useFontFamily("bold", "ko");
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={[styles.title, { fontFamily }]}>
        {strings.mapsTitle}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.addMap}
        onPress={onAdd}
        style={styles.add}
      >
        <Plus size={theme.size.icon} color={theme.color.labelNormal} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: theme.size.appbar,
    paddingLeft: theme.space.screen + theme.space.md,
    paddingRight: theme.space.sm,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.cardValue.fontSize,
    lineHeight: theme.typography.cardValue.lineHeight,
    color: theme.color.labelNormal,
  },
  add: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
});
