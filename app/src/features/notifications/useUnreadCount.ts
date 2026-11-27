import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import type { NotificationsApi } from "./api";
import { subscribeUnreadChange } from "./unreadEvents";

const POLL_INTERVAL_MS = 30_000;

/**
 * 바로 한 번, 이후 주기적으로 refresh를 부른다. 백그라운드에서는 멈추고
 * 앱이 다시 앞으로 오면 바로 부른다. 반환한 함수로 전부 해제한다.
 */
function pollWhileActive(refresh: () => void): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const start = (): void => {
    stop();
    refresh();
    timer = setInterval(refresh, POLL_INTERVAL_MS);
  };
  // 실행 직후에는 상태를 아직 모를 수 있어 background만 제외한다.
  if (AppState.currentState !== "background") start();
  const appState = AppState.addEventListener("change", (next) => {
    if (next === "active") start();
    else stop();
  });
  const unsubscribe = subscribeUnreadChange(() => {
    if (timer !== null) refresh();
  });
  return () => {
    stop();
    appState.remove();
    unsubscribe();
  };
}

/** NOTI-02. 화면이 보이는 동안만 조회한다. api는 참조가 고정돼 있어야 한다. */
export function useUnreadCount(api: NotificationsApi): number {
  const [count, setCount] = useState(0);
  // 늦게 도착한 이전 응답이 새 값을 덮지 않게 한다.
  const generation = useRef(0);

  const refresh = useCallback((): void => {
    const current = ++generation.current;
    api.unreadCount().then(
      (next) => {
        if (current === generation.current) setCount(next);
      },
      () => {
        // 배지는 보조 표시라 실패해도 알리지 않고 마지막 값을 둔다.
      },
    );
  }, [api]);

  useFocusEffect(useCallback(() => pollWhileActive(refresh), [refresh]));

  return count;
}
