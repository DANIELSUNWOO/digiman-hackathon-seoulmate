import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { pollWhileActive } from "../polling";
import type { NotificationsApi } from "./api";
import { subscribeUnreadChange } from "./unreadEvents";

const POLL_INTERVAL_MS = 30_000;

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

  useFocusEffect(
    useCallback(() => {
      const poll = pollWhileActive(refresh, POLL_INTERVAL_MS);
      const unsubscribe = subscribeUnreadChange(() => {
        if (poll.isRunning()) refresh();
      });
      return () => {
        poll.stop();
        unsubscribe();
      };
    }, [refresh]),
  );

  return count;
}
