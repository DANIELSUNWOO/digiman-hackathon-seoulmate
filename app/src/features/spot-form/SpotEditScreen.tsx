// 스팟 수정·삭제. 고칠 수 없는 상태면 이유를 보여 준다.
import type { ReactElement } from "react";
import { AppBar, Button, Label, Screen } from "../../ui";
import {
  LoadError,
  Loading,
  mateHomeApi,
  useMapWithLock,
  type MateHomeApi,
} from "../mate-home";
import { pickPhoto as pickFromDevice, type PickPhoto } from "../photo-upload";
import { spotFormApi, type SpotFormApi } from "./api";
import { EditSpotForm } from "./EditSpotForm";
import { strings } from "./strings";

export interface SpotEditScreenProps {
  mapId: number;
  spotId: number;
  api?: SpotFormApi;
  mapApi?: MateHomeApi;
  pickPhoto?: PickPhoto;
  onBack: () => void;
  onDone: () => void;
  onChangePreviews: () => void;
}

export function SpotEditScreen({
  mapId,
  spotId,
  api = spotFormApi,
  mapApi = mateHomeApi,
  pickPhoto = pickFromDevice,
  onBack,
  onDone,
  onChangePreviews,
}: SpotEditScreenProps): ReactElement {
  const { state, retry } = useMapWithLock(mapApi, mapId);
  const data = state.status === "ready" ? state.data : null;
  const spot = data?.map.spots.find((item) => item.spotId === spotId);

  if (data && spot && !data.locked && !spot.isPreview)
    return (
      <EditSpotForm
        api={api}
        spot={spot}
        pickPhoto={pickPhoto}
        onBack={onBack}
        onDone={onDone}
      />
    );
  return (
    <Screen>
      <AppBar title={strings.editTitle} language="ko" onBack={onBack} />
      {state.status === "loading" && <Loading shape="form" />}
      {state.status === "error" && (
        <LoadError error={state.error} onRetry={retry} />
      )}
      {data && !spot && <Reason text={strings.errorSpotNotFound} />}
      {data && spot && (
        <Blocked
          name={spot.name}
          locked={data.locked}
          // 공개 2곳 말고 다른 스팟이 있어야 바꿀 수 있다.
          canChange={data.map.spots.length > 2}
          onChange={onChangePreviews}
        />
      )}
    </Screen>
  );
}

interface BlockedProps {
  name: string;
  /** 여행 중인 여행자가 있는지. 아니면 공개 스팟이라 막힌 것이다. */
  locked: boolean;
  canChange: boolean;
  onChange: () => void;
}

function Blocked({
  name,
  locked,
  canChange,
  onChange,
}: BlockedProps): ReactElement {
  return (
    <>
      <Label weight="bold" language="ko">
        {name}
      </Label>
      <Reason text={locked ? strings.editLocked : strings.editPreview} />
      {!locked &&
        (canChange ? (
          <Button
            label={strings.changePreviews}
            language="ko"
            onPress={onChange}
          />
        ) : (
          <Reason text={strings.editPreviewNeedsSpot} />
        ))}
    </>
  );
}

function Reason({ text }: { text: string }): ReactElement {
  return (
    <Label center language="ko">
      {text}
    </Label>
  );
}
