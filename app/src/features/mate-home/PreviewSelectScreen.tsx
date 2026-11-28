// M-14 공개 스팟 2곳 지정
import { Fragment, type ReactElement } from "react";
import { Button, Card, ErrorNotice, Label, Notice, Screen } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { BackButton } from "./BackButton";
import { LoadError, Loading } from "./LoadStatus";
import { MAP_PREVIEW_SPOTS } from "./model";
import { strings } from "./strings";
import type { MapSpot } from "./types";
import { useMapWithLock } from "./useMapWithLock";
import { usePreviewSelect } from "./usePreviewSelect";

export interface PreviewSelectScreenProps {
  api?: MateHomeApi;
  mapId: number;
  onBack: () => void;
  onSaved: () => void;
}

export function PreviewSelectScreen({
  api = mateHomeApi,
  mapId,
  onBack,
  onSaved,
}: PreviewSelectScreenProps): ReactElement {
  const { state, retry } = useMapWithLock(api, mapId);

  return (
    <Screen>
      <BackButton onPress={onBack} />
      <Label title language="ko">
        {strings.previewsTitle}
      </Label>
      {state.status === "loading" && <Loading />}
      {state.status === "error" && (
        <LoadError error={state.error} onRetry={retry} />
      )}
      {/* 주소로 바로 들어올 수 있어 여기서도 막는다. */}
      {state.status === "ready" &&
        (state.data.locked ? (
          <Label center language="ko">
            {strings.previewsLocked}
          </Label>
        ) : state.data.map.spots.length < MAP_PREVIEW_SPOTS ? (
          <Label center language="ko">
            {strings.previewsNeedSpots}
          </Label>
        ) : (
          <Selection
            api={api}
            mapId={mapId}
            spots={state.data.map.spots}
            onSaved={onSaved}
          />
        ))}
    </Screen>
  );
}

interface SelectionProps {
  api: MateHomeApi;
  mapId: number;
  spots: MapSpot[];
  onSaved: () => void;
}

function Selection({
  api,
  mapId,
  spots,
  onSaved,
}: SelectionProps): ReactElement {
  const { selected, blockedId, saving, error, toggle, save } = usePreviewSelect(
    api,
    mapId,
    spots,
    onSaved,
  );
  const remaining = MAP_PREVIEW_SPOTS - selected.length;
  const doneLabel = saving ? strings.saving : strings.save;
  return (
    <>
      <Label language="ko">{strings.previewsGuide}</Label>
      <Label language="ko" variant="caption" tone="desc">
        {strings.previewsLockNotice}
      </Label>
      {spots.map((spot) => (
        <Fragment key={spot.spotId}>
          <SpotOption
            spot={spot}
            selected={selected.includes(spot.spotId)}
            onPress={() => toggle(spot.spotId)}
          />
          {/* 목록이 길어도 누른 자리에서 보이게 한다. */}
          {blockedId === spot.spotId && (
            <Notice language="ko">{strings.previewsFull}</Notice>
          )}
        </Fragment>
      ))}
      {error && <ErrorNotice language="ko">{error}</ErrorNotice>}
      <Button
        label={remaining > 0 ? strings.previewRemaining(remaining) : doneLabel}
        language="ko"
        disabled={saving || remaining !== 0}
        onPress={() => void save()}
      />
    </>
  );
}

function SpotOption({
  spot,
  selected,
  onPress,
}: {
  spot: MapSpot;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Card selected={selected} onPress={onPress}>
      <Label weight="bold" language="ko">
        {spot.name}
      </Label>
      {!!spot.address && <Label language="ko">{spot.address}</Label>}
      {selected && (
        <Label weight="medium" language="ko">
          {strings.previewSelected}
        </Label>
      )}
    </Card>
  );
}
