import { useRole } from "../../src/state";
import { Label, Screen } from "../../src/ui";
export default function Map() {
  const { role } = useRole();
  return (
    <Screen>
      <Label title>{role === "mate" ? "지도" : "地図"}</Label>
      <Label>{role === "mate" ? "준비 중입니다" : "準備中です"}</Label>
    </Screen>
  );
}
