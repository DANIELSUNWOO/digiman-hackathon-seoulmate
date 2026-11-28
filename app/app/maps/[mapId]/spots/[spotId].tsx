import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { parseMapId, useBackOr } from "../../../../src/features/mate-home";
import { SpotEditScreen } from "../../../../src/features/spot-form";

export default function EditSpot(): ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapId = parseMapId(params.mapId);
  // 스팟 번호도 같은 규칙(양의 정수)이다.
  const spotId = parseMapId(params.spotId);
  const back = useBackOr(mapId === null ? "/map" : `/maps/${mapId}`);
  if (mapId === null) return <Redirect href="/map" />;
  if (spotId === null) return <Redirect href={`/maps/${mapId}`} />;
  return (
    <SpotEditScreen
      mapId={mapId}
      spotId={spotId}
      onBack={back}
      onDone={back}
      onChangePreviews={() => router.push(`/maps/${mapId}/previews`)}
    />
  );
}
