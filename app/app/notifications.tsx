import { Redirect, useRouter } from "expo-router";
import type { ReactElement } from "react";
import {
  destinationFor,
  NotificationsScreen,
} from "../src/features/notifications";
import { useSession } from "../src/session";
import { nextStep } from "../src/users";
import { useScopedNavigation } from "../src/features/course-map/useScopedNavigation";

// 탭 바깥 경로라 탭과 같은 로그인·가입·온보딩 확인을 여기서 한다. 여행자·메이트 모두 쓴다.
export default function Notifications(): ReactElement | null {
  const router = useRouter();
  const { session, ready, load, busy } = useSession();
  const step = load.kind === "ready" ? nextStep(load.me) : null;
  const identity = JSON.stringify([
    session?.user.id ?? null,
    session?.access_token ?? null,
    ready,
    busy,
    load.kind,
    load.kind === "ready" ? load.me.userId : null,
    load.kind === "ready" ? load.me.role : null,
    step,
  ]);
  const navigate = useScopedNavigation(identity);
  if (!ready) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready") return <Redirect href="/account" />;
  if (step && step !== "trip") return <Redirect href="/account" />;

  return (
    <NotificationsScreen
      lang={load.me.language}
      onOpen={(item) => {
        const destination = destinationFor(item, load.me.role);
        navigate(() => {
          if (destination === "/(tabs)") router.dismissTo(destination);
          else router.push(destination);
        });
      }}
      onBack={() =>
        navigate(() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)"),
        )
      }
    />
  );
}
