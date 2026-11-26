import { MateHomeScreen } from "../../src/features/mate-home";
import { useRole } from "../../src/state";
import { Label, Screen } from "../../src/ui";
export default function Home() {
  const { role } = useRole();
  if (role === "mate") return <MateHomeScreen />;
  return (
    <Screen>
      <Label title>ホーム</Label>
      <Label>準備中です</Label>
    </Screen>
  );
}
