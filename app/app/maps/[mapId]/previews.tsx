import { Redirect, useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import {
  parseMapId,
  PreviewSelectScreen,
  useBackOr,
} from "../../../src/features/mate-home";

export default function Previews(): ReactElement {
  const mapId = parseMapId(useLocalSearchParams().mapId);
  const back = useBackOr(mapId === null ? "/map" : `/maps/${mapId}`);
  if (mapId === null) return <Redirect href="/map" />;
  return <PreviewSelectScreen mapId={mapId} onBack={back} onSaved={back} />;
}
