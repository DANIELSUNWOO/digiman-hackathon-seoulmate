import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { pollWhileActive } from "../polling";
import type { VisitsApi } from "./api";
import type { VisitRecord } from "./types";

// 티켓은 10~15초. 요청 제한 시간(15초)보다 자주 부르지 않는다.
const POLL_INTERVAL_MS = 15_000;

export type VisitsState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; visits: VisitRecord[]; refreshError: unknown };

/** 이미 보고 있던 목록은 에러 화면으로 바꾸지 않는다. */
function withFailure(previous: VisitsState, error: unknown): VisitsState {
  return previous.status === "ready"
    ? { ...previous, refreshError: error }
    : { status: "error", error };
}

/** VISIT-02. 화면이 보이는 동안만 조회한다. api는 참조가 고정돼 있어야 한다. */
export function useVisits(api: VisitsApi, matchId: number) {
  const [state, setState] = useState<VisitsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // 화면을 벗어난 뒤 도착한 응답은 버린다.
      let active = true;
      // 느린 네트워크에서 요청이 쌓이지 않게, 끝나기 전에는 다시 보내지 않는다.
      let pending = false;
      const refresh = (): void => {
        if (pending) return;
        pending = true;
        api.list(matchId).then(
          (visits) => {
            pending = false;
            if (active)
              setState({ status: "ready", visits, refreshError: null });
          },
          (error: unknown) => {
            pending = false;
            if (active) setState((previous) => withFailure(previous, error));
          },
        );
      };
      const poll = pollWhileActive(refresh, POLL_INTERVAL_MS);
      return () => {
        active = false;
        poll.stop();
      };
    }, [api, matchId, attempt]),
  );

  const retry = (): void => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  };

  return { state, retry };
}
