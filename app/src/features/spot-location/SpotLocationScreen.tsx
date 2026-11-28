// M-12 스팟 추가: 장소 검색으로 위치를 정한다. 지도 탭으로 지정하지 않는다 (2026-11-28 결정).
import type { ReactElement } from "react";
import { AppBar, Screen } from "../../ui";
import { PlaceSearch, type PlaceSearchApi } from "../place-search";
import { SpotConfirmSheet } from "./SpotConfirmSheet";
import { strings } from "./strings";
import type { SpotLocation } from "./types";
import { useSpotDraft } from "./useSpotDraft";

export interface SpotLocationScreenProps {
  api?: PlaceSearchApi;
  onBack: () => void;
  /** 확인 시트가 닫힌 뒤 한 번 불린다. 저장은 하지 않는다. */
  onPicked: (location: SpotLocation) => void;
}

export function SpotLocationScreen({
  api,
  onBack,
  onPicked,
}: SpotLocationScreenProps): ReactElement {
  const spot = useSpotDraft(onPicked);
  return (
    <Screen>
      <AppBar title={strings.title} language="ko" onBack={onBack} />
      {/* 지도 표시와 등록한 스팟 묶음은 MapView(Q-02)가 생기면 이 아래에 붙인다. */}
      <PlaceSearch api={api} onSelect={spot.select} />
      <SpotConfirmSheet spot={spot} />
    </Screen>
  );
}
