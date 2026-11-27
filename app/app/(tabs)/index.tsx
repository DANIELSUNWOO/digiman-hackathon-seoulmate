import { useRouter } from "expo-router";
import { MateHomeScreen } from "../../src/features/mate-home";
import { NotificationBell } from "../../src/features/notifications";
import { useRole } from "../../src/state";
import { Label, Screen } from "../../src/ui";
export default function Home() {
  const { role } = useRole();
  const router = useRouter();
  if (role === "mate")
    return (
      <MateHomeScreen
        headerRight={
          <NotificationBell
            lang="ko"
            onPress={() => router.push("/notifications")}
          />
        }
        onOpenVisits={(matchId) => router.push(`/matches/${matchId}/visits`)}
      />
    );
  return (
    <Screen>
      <Label title>ホーム</Label>
      <Label>準備中です</Label>
    </Screen>
  );
}
