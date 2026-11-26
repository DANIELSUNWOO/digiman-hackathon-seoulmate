import { useRouter } from "expo-router";
import { MyMapsScreen } from "../../src/features/mate-home";
import { useRole } from "../../src/state";
import { Label, Screen } from "../../src/ui";
export default function Map() {
  const { role } = useRole();
  const router = useRouter();
  if (role === "mate")
    return (
      <MyMapsScreen
        onCreate={() => router.push("/maps/new")}
        onOpenMap={(mapId) => router.push(`/maps/${mapId}`)}
      />
    );
  return (
    <Screen>
      <Label title>地図</Label>
      <Label>準備中です</Label>
    </Screen>
  );
}
