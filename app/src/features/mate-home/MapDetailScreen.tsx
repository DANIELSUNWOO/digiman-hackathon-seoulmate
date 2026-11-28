// M-10a 내 지도 상세: 노출 조건, 스팟 목록, 스팟 추가·공개 지정, 지도 수정·삭제.
import { View } from "react-native";
import { Button, Label, Screen } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { BackButton } from "./BackButton";
import { DeleteMap } from "./DeleteMap";
import { ExposureBadge } from "./ExposureBadge";
import { ExposureChecklist } from "./ExposureChecklist";
import { LoadError, Loading } from "./LoadStatus";
import { MAP_PREVIEW_SPOTS } from "./model";
import { SpotList } from "./SpotList";
import { strings } from "./strings";
import type { MapDetail } from "./types";
import { useMapWithLock } from "./useMapWithLock";

type Props = {
  api?: MateHomeApi;
  mapId: number;
  onBack: () => void;
  onAddSpot: () => void;
  onOpenSpot: (spotId: number) => void;
  onPickPreviews: () => void;
  onEdit: () => void;
  onDeleted: () => void;
};

export function MapDetailScreen(props: Props) {
  const { api = mateHomeApi, mapId, onBack, onOpenSpot } = props;
  const { state, retry } = useMapWithLock(api, mapId);

  return (
    <Screen>
      <BackButton onPress={onBack} />
      {state.status === "loading" && <Loading />}
      {state.status === "error" && (
        <LoadError error={state.error} onRetry={retry} />
      )}
      {state.status === "ready" && (
        <>
          <MapSummary map={state.data.map} />
          {/* 공개·잠긴 스팟도 눌러서 이유를 볼 수 있다. */}
          <SpotList spots={state.data.map.spots} onOpenSpot={onOpenSpot} />
          <MapActions {...props} api={api} {...state.data} />
        </>
      )}
    </Screen>
  );
}

function MapSummary({ map }: { map: MapDetail }) {
  return (
    <View>
      <ExposureBadge isPublic={map.isPublic} />
      <Label title language="ko">
        {map.title}
      </Label>
      {!!map.caption?.original && (
        <Label language="ko">{map.caption.original}</Label>
      )}
      <ExposureChecklist
        spotCount={map.spots.length}
        previewCount={map.spots.filter((spot) => spot.isPreview).length}
      />
    </View>
  );
}

type ActionsProps = Props & {
  api: MateHomeApi;
  map: MapDetail;
  locked: boolean;
};

function MapActions({ api, mapId, map, locked, ...actions }: ActionsProps) {
  return (
    <>
      {/* 여행 중인 여행자가 있어도 새 스팟 추가는 된다. */}
      <Button
        label={strings.addSpot}
        language="ko"
        onPress={actions.onAddSpot}
      />
      {locked ? (
        <Label center language="ko">
          {strings.locked}
        </Label>
      ) : (
        <>
          <Button
            label={strings.pickPreviews}
            language="ko"
            secondary
            disabled={map.spots.length < MAP_PREVIEW_SPOTS}
            onPress={actions.onPickPreviews}
          />
          <Button
            label={strings.edit}
            language="ko"
            secondary
            onPress={actions.onEdit}
          />
          <DeleteMap api={api} mapId={mapId} onDeleted={actions.onDeleted} />
        </>
      )}
    </>
  );
}
