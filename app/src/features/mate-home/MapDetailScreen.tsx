// M-10a 내 지도 상세: 상태와 소개, 스팟 목록, 다음에 할 일.
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { AppBar } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { DetailActions } from "./DetailActions";
import { DetailSummary } from "./DetailSummary";
import { FlatCard } from "./FlatCard";
import { GrayPage } from "./GrayPage";
import { LoadError, Loading } from "./LoadStatus";
import { SpotList } from "./SpotList";
import { useMapWithLock } from "./useMapWithLock";

export interface MapDetailScreenProps {
  api?: MateHomeApi;
  mapId: number;
  onBack: () => void;
  onAddSpot: () => void;
  onOpenSpot: (spotId: number) => void;
  onPickPreviews: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function MapDetailScreen({
  api = mateHomeApi,
  mapId,
  onBack,
  onOpenSpot,
  ...actions
}: MapDetailScreenProps): ReactElement {
  const { state, retry } = useMapWithLock(api, mapId);
  const title = state.status === "ready" ? state.data.map.title : "";
  return (
    <GrayPage
      edges={["top", "bottom", "left", "right"]}
      header={
        <View style={styles.header}>
          <AppBar title={title} onBack={onBack} language="ko" />
        </View>
      }
    >
      {state.status === "loading" && <Loading />}
      {state.status === "error" && (
        <FlatCard>
          <LoadError error={state.error} onRetry={retry} />
        </FlatCard>
      )}
      {state.status === "ready" && (
        <>
          <DetailSummary
            map={state.data.map}
            selectedCount={state.data.selectedCount}
          />
          <SpotList spots={state.data.map.spots} onOpenSpot={onOpenSpot} />
          <DetailActions api={api} {...actions} {...state.data} />
        </>
      )}
    </GrayPage>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: theme.space.screen },
});
