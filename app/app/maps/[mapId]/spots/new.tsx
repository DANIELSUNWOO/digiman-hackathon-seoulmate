import { Redirect, useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { parseMapId, useBackOr } from "../../../../src/features/mate-home";
import { AddSpotFlow } from "../../../../src/features/spot-form";

export default function NewSpot(): ReactElement {
  const mapId = parseMapId(useLocalSearchParams().mapId);
  const back = useBackOr(mapId === null ? "/map" : `/maps/${mapId}`);
  if (mapId === null) return <Redirect href="/map" />;
  // 저장하면 지도 상세로 돌아가고, 상세는 다시 불러온다.
  return <AddSpotFlow mapId={mapId} onBack={back} onSaved={back} />;
}
