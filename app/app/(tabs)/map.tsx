import { MyMapsScreen } from "../../src/features/mate-home";
import { useRole } from "../../src/state";
import { Label, Screen } from "../../src/ui";
export default function Map() {
  const { role } = useRole();
  if (role === "mate") return <MyMapsScreen />;
  return (
    <Screen>
      <Label title>地図</Label>
      <Label>準備中です</Label>
    </Screen>
  );
}
