import { Redirect, useLocalSearchParams } from "expo-router";
import {
  EditMapScreen,
  parseMapId,
  useBackOr,
} from "../../../src/features/mate-home";

export default function Edit() {
  const mapId = parseMapId(useLocalSearchParams().mapId);
  const back = useBackOr(mapId === null ? "/map" : `/maps/${mapId}`);
  if (mapId === null) return <Redirect href="/map" />;
  return <EditMapScreen mapId={mapId} onBack={back} onSaved={back} />;
}
