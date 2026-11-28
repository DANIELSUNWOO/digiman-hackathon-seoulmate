// 스팟 추가 흐름: 장소 검색(M-12) → 스팟 정보(M-13) → 저장.
import { Stack } from "expo-router";
import { useEffect, useState, type ReactElement } from "react";
import { BackHandler, Platform } from "react-native";
import { pickPhoto as pickFromDevice, type PickPhoto } from "../photo-upload";
import type { PlaceSearchApi } from "../place-search";
import { SpotLocationScreen, type SpotLocation } from "../spot-location";
import { spotFormApi, type SpotFormApi } from "./api";
import { SpotFormScreen } from "./SpotFormScreen";
import { createSpotSubmit } from "./submission";
import { useSpotFields } from "./useSpotFields";
import { useSpotSave } from "./useSpotSave";

export interface AddSpotFlowProps {
  mapId: number;
  api?: SpotFormApi;
  placeApi?: PlaceSearchApi;
  pickPhoto?: PickPhoto;
  onBack: () => void;
  onSaved: () => void;
}

/** 안드로이드 뒤로 키는 흐름을 닫지 않고 앞 단계로 간다. */
function useStepBack(active: boolean, goBack: () => void): void {
  useEffect(() => {
    if (!active || Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        goBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [active, goBack]);
}

export function AddSpotFlow({
  mapId,
  api = spotFormApi,
  placeApi,
  pickPhoto = pickFromDevice,
  onBack,
  onSaved,
}: AddSpotFlowProps): ReactElement {
  const [location, setLocation] = useState<SpotLocation | null>(null);
  const fields = useSpotFields();
  const [submit] = useState(() => createSpotSubmit(api, mapId));
  const saving = useSpotSave(submit, onSaved);
  const busy = saving.progress !== null;
  const showPlaces = (): void => {
    if (!busy) setLocation(null);
  };
  useStepBack(location !== null, showPlaces);

  return (
    <>
      {/* 입력 중에는 밀어서 흐름 전체를 닫지 못하게 한다. */}
      <Stack.Screen options={{ gestureEnabled: location === null }} />
      {location === null ? (
        <SpotLocationScreen
          api={placeApi}
          onBack={onBack}
          onPicked={setLocation}
        />
      ) : (
        <SpotFormScreen
          location={location}
          fields={fields}
          saving={saving}
          pickPhoto={pickPhoto}
          onRename={(name) => setLocation({ ...location, name })}
          onBack={showPlaces}
        />
      )}
    </>
  );
}
