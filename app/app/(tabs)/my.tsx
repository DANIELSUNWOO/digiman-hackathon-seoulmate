import { useRole } from "../../src/state";
import { Label, Screen } from "../../src/ui";
export default function My() {
  const { role } = useRole();
  return (
    <Screen>
      <Label title>{role === "mate" ? "마이" : "マイ"}</Label>
      <Label>{role === "mate" ? "준비 중입니다" : "準備中です"}</Label>
    </Screen>
  );
}
