import { useRouter } from "expo-router";
import { MyMapsScreen } from "../../src/features/mate-home";
import { TemporaryVisitEntry } from "../../src/features/visit-verify";
import { useRole } from "../../src/state";
import { Button, Label, Screen } from "../../src/ui";
export default function Map() {
  const { role } = useRole();
  const router = useRouter();
  if (role === "mate")
    return (
      <MyMapsScreen
        onCreate={() => router.push("/maps/new")}
        onOpenMap={(mapId) => router.push(`/maps/${mapId}`)}
        onAddSpot={(mapId) => router.push(`/maps/${mapId}/spots/new`)}
        onPickPreviews={(mapId) => router.push(`/maps/${mapId}/previews`)}
      />
    );
  return (
    <Screen>
      <Label title>地図</Label>
      <Button label="地図を選ぶ" onPress={() => router.push("/explore")} />
      {/* 임시: 방문 인증 진입점. 코스 지도가 생기면 지운다. */}
      <TemporaryVisitEntry
        onCheckIn={(matchId, spotId) =>
          router.push(`/visit/verify?matchId=${matchId}&spotId=${spotId}`)
        }
      />
    </Screen>
  );
}
