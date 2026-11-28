// M-20에서 매칭이 없을 때: 지도가 아직 보이지 않는지, 기다리면 되는지 알려 준다.
import { useCallback, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Button, Card, Label } from "../../ui";
import type { MateHomeApi } from "./api";
import { ExposureChecklist } from "./ExposureChecklist";
import { LoadError, Loading } from "./LoadStatus";
import { closestToExposure, MAP_MIN_SPOTS, MAP_PREVIEW_SPOTS } from "./model";
import { strings } from "./strings";
import type { MyMap } from "./types";
import { useLoad } from "./useLoad";

export interface EmptyMatchesProps {
  api: MateHomeApi;
  onOpenMap: (mapId: number) => void;
  onCreateMap: () => void;
}

/** api는 참조가 고정돼 있어야 한다. */
export function EmptyMatches({
  api,
  onOpenMap,
  onCreateMap,
}: EmptyMatchesProps): ReactElement {
  const load = useCallback(() => api.getMyMaps(), [api]);
  const { state, retry } = useLoad(load);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error")
    return <LoadError error={state.error} onRetry={retry} />;
  if (state.data.some((map) => map.isPublic)) return <WaitingForMatch />;
  const draft = closestToExposure(state.data);
  return (
    <NotExposed
      map={draft}
      onPress={draft ? () => onOpenMap(draft.mapId) : onCreateMap}
    />
  );
}

function WaitingForMatch(): ReactElement {
  return (
    <Card>
      <Label weight="bold" language="ko">
        {strings.matchEmpty}
      </Label>
      <Label language="ko">{strings.matchEmptyHint}</Label>
    </Card>
  );
}

interface NotExposedProps {
  /** 노출에 가장 가까운 지도. 만든 지도가 없으면 null */
  map: MyMap | null;
  onPress: () => void;
}

function NotExposed({ map, onPress }: NotExposedProps): ReactElement {
  return (
    <Card>
      <Label weight="bold" language="ko">
        {strings.notExposedTitle}
      </Label>
      {map ? (
        <>
          <Label language="ko">{map.title}</Label>
          <ExposureChecklist
            spotCount={map.spotCount}
            previewCount={map.previewCount}
          />
        </>
      ) : (
        <Label language="ko">
          {strings.notExposedNoMap(MAP_MIN_SPOTS, MAP_PREVIEW_SPOTS)}
        </Label>
      )}
      <View style={styles.action}>
        <Button
          label={map ? strings.continueMap : strings.createMap}
          language="ko"
          onPress={onPress}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: theme.space.md },
});
