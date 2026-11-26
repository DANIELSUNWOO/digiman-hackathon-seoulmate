import { Redirect, useRouter } from "expo-router";
import type { ReactElement } from "react";
import {
  destinationFor,
  NotificationsScreen,
} from "../src/features/notifications";
import { useSession } from "../src/session";
import { useRole } from "../src/state";

// 탭 바깥 경로라 탭과 같은 로그인 확인을 여기서 한다. 여행자·메이트 모두 쓴다.
export default function Notifications(): ReactElement | null {
  const router = useRouter();
  const { role, ready: roleReady } = useRole();
  const { session, ready: sessionReady } = useSession();
  if (!roleReady || !sessionReady) return null;
  if (!role || !session) return <Redirect href="/auth" />;

  return (
    <NotificationsScreen
      lang={role === "mate" ? "ko" : "ja"}
      onOpen={(item) => router.dismissTo(destinationFor(item))}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)")
      }
    />
  );
}
