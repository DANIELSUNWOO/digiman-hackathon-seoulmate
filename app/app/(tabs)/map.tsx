import { useRouter } from "expo-router";
import { MyMapsScreen } from "../../src/features/mate-home";
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
      />
    );
  return (
    <Screen>
      <Label title>地図</Label>
      <Button label="地図を選ぶ" onPress={() => router.push("/explore")} />
    </Screen>
  );
}
