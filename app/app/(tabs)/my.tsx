import { useRouter } from "expo-router";
import { useSession } from "../../src/session";
import { AppBar, Button, Label, Screen } from "../../src/ui";
export default function My() {
  const router = useRouter();
  const { load } = useSession();
  const ko = load.kind === "ready" && load.me.language === "ko";
  const language = ko ? "ko" : "ja";
  return (
    <Screen>
      <AppBar title={ko ? "마이" : "マイ"} language={language} />
      <Label language={language}>{ko ? "준비 중입니다" : "準備中です"}</Label>
      <Button
        secondary
        language={language}
        label={ko ? "계정 관리" : "アカウント管理"}
        onPress={() => router.navigate("/account")}
      />
    </Screen>
  );
}
