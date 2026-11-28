import { Redirect, useRouter } from "expo-router";
import type { ReactElement } from "react";
import {
  destinationFor,
  NotificationsScreen,
} from "../src/features/notifications";
import { useSession } from "../src/session";
import { nextStep } from "../src/users";

// 탭 바깥 경로라 탭과 같은 로그인·가입·온보딩 확인을 여기서 한다. 여행자·메이트 모두 쓴다.
export default function Notifications(): ReactElement | null {
  const router = useRouter();
  const { session, ready, load, busy } = useSession();
  if (!ready) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready") return <Redirect href="/account" />;
  // 여행 종료일이 지난 여행자는 "trip" 단계가 다시 남는다. 종료 알림은 볼 수 있어야 한다.
  const step = nextStep(load.me);
  if (step && step !== "trip") return <Redirect href="/account" />;

  return (
    <NotificationsScreen
      lang={load.me.language}
      onOpen={(item) => router.dismissTo(destinationFor(item))}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)")
      }
    />
  );
}
