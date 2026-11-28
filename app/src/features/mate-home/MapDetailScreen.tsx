// M-10a 내 지도 상세: 스팟 목록, 스팟 추가, 지도 수정·삭제.
import { View } from "react-native";
import { Button, Card, Label, Screen } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { BackButton } from "./BackButton";
import { DeleteMap } from "./DeleteMap";
import { ExposureBadge } from "./ExposureBadge";
import { LoadError, Loading } from "./LoadStatus";
import { previewLabel, spotLabel } from "./model";
import { strings } from "./strings";
import type { MapDetail, MapSpot } from "./types";
import { useMapWithLock } from "./useMapWithLock";

export function MapDetailScreen({
  api = mateHomeApi,
  mapId,
  onBack,
  onAddSpot,
  onEdit,
  onDeleted,
}: {
  api?: MateHomeApi;
  mapId: number;
  onBack: () => void;
  onAddSpot: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
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
          <SpotList spots={state.data.map.spots} />
          {/* 여행 중인 여행자가 있어도 새 스팟 추가는 된다. */}
          <Button label={strings.addSpot} language="ko" onPress={onAddSpot} />
          {state.data.locked ? (
            <Label center language="ko">
              {strings.locked}
            </Label>
          ) : (
            <>
              <Button
                label={strings.edit}
                language="ko"
                secondary
                onPress={onEdit}
              />
              <DeleteMap api={api} mapId={mapId} onDeleted={onDeleted} />
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function MapSummary({ map }: { map: MapDetail }) {
  const spotCount = map.spots.length;
  const previewCount = map.spots.filter((spot) => spot.isPreview).length;
  return (
    <View>
      <ExposureBadge isPublic={map.isPublic} />
      <Label title language="ko">
        {map.title}
      </Label>
      {!!map.caption?.original && (
        <Label language="ko">{map.caption.original}</Label>
      )}
      <Label language="ko">
        {`${spotLabel({ spotCount })} · ${previewLabel({ previewCount })}`}
      </Label>
    </View>
  );
}

function SpotList({ spots }: { spots: MapSpot[] }) {
  return (
    <>
      <Label weight="bold" language="ko">
        {strings.spotSection}
      </Label>
      {spots.length === 0 && <Label language="ko">{strings.spotEmpty}</Label>}
      {/* 스팟 수정 화면(Q-08)이 생기면 카드에 이동을 붙인다. */}
      {spots.map((spot) => (
        <Card key={spot.spotId}>
          <Label weight="bold" language="ko">
            {spot.name}
          </Label>
          {!!spot.address && <Label language="ko">{spot.address}</Label>}
          {!!spot.review?.original && (
            <Label language="ko">
              {strings.spotReview(spot.review.original)}
            </Label>
          )}
          {!!spot.reason?.original && (
            <Label language="ko">
              {strings.spotReason(spot.reason.original)}
            </Label>
          )}
          {spot.isPreview && (
            <Label weight="medium" language="ko">
              {strings.spotPreview}
            </Label>
          )}
        </Card>
      ))}
    </>
  );
}
