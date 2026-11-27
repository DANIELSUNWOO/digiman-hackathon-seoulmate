// M-10 내 지도 목록: 노출 상태와 부족한 조건을 보여 준다.
import { useCallback } from "react";
import { Button, Card, Label, Screen } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { ExposureBadge } from "./ExposureBadge";
import { LoadError, Loading } from "./LoadStatus";
import { previewLabel, spotLabel } from "./model";
import { strings } from "./strings";
import type { MyMap } from "./types";
import { useLoad } from "./useLoad";

export function MyMapsScreen({
  api = mateHomeApi,
  onCreate,
  onOpenMap,
}: {
  api?: MateHomeApi;
  onCreate: () => void;
  onOpenMap: (mapId: number) => void;
}) {
  const load = useCallback(() => api.getMyMaps(), [api]);
  const { state, retry } = useLoad(load);

  return (
    <Screen>
      <Label title language="ko">
        {strings.mapsTitle}
      </Label>
      {state.status === "loading" && <Loading />}
      {state.status === "error" && (
        <LoadError error={state.error} onRetry={retry} />
      )}
      {state.status === "ready" && (
        <>
          {state.data.length === 0 && (
            <Label center language="ko">
              {strings.mapsEmpty}
            </Label>
          )}
          {state.data.map((map) => (
            <MapCard
              key={map.mapId}
              map={map}
              onPress={() => onOpenMap(map.mapId)}
            />
          ))}
          <Button label={strings.createMap} language="ko" onPress={onCreate} />
        </>
      )}
    </Screen>
  );
}

function MapCard({ map, onPress }: { map: MyMap; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <ExposureBadge isPublic={map.isPublic} />
      <Label weight="bold" language="ko">
        {map.title}
      </Label>
      {!!map.caption?.original && (
        <Label language="ko">{map.caption.original}</Label>
      )}
      <Label language="ko">{`${spotLabel(map)} · ${previewLabel(map)}`}</Label>
      {map.selectedCount !== undefined && (
        <Label language="ko">{strings.selectedCount(map.selectedCount)}</Label>
      )}
      {!!map.travelingCount && (
        <Label language="ko">
          {strings.travelingCount(map.travelingCount)}
        </Label>
      )}
    </Card>
  );
}
