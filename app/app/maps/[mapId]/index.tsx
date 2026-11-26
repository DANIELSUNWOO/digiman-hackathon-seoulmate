import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  MapDetailScreen,
  parseMapId,
  useBackOr,
} from "../../../src/features/mate-home";

export default function Detail() {
  const router = useRouter();
  const back = useBackOr("/map");
  const mapId = parseMapId(useLocalSearchParams().mapId);
  if (mapId === null) return <Redirect href="/map" />;
  return (
    <MapDetailScreen
      mapId={mapId}
      onBack={back}
      onEdit={() => router.push(`/maps/${mapId}/edit`)}
      onDeleted={back}
    />
  );
}
