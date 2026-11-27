import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
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

/** 목록의 방문 기록 하나만 바꾼 새 상태 */
function withChanges(
  previous: VisitsState,
  visitId: number,
  changes: Partial<VisitRecord>,
): VisitsState {
  if (previous.status !== "ready") return previous;
  const visits = previous.visits.map((visit) =>
    visit.visitId === visitId ? { ...visit, ...changes } : visit,
  );
  return { ...previous, visits };
}

/**
 * 쓰기와 조회가 엇갈리지 않게 한다. 쓰는 동안에는 조회하지 않고, 그전에 보낸
 * 조회의 응답은 버리며, 마지막 쓰기가 끝나면 다시 불러온다.
 */
function useWriteGate() {
  // 쓰기를 시작할 때마다 올린다.
  const version = useRef(0);
  const writing = useRef(0);
  const refreshRef = useRef<() => void>(() => {});

  const write = useCallback(async (request: () => Promise<void>) => {
    version.current += 1;
    writing.current += 1;
    try {
      await request();
    } finally {
      writing.current -= 1;
      if (writing.current === 0) refreshRef.current();
    }
  }, []);

  return { version, writing, refreshRef, write };
}

/** VISIT-02. 화면이 보이는 동안만 조회한다. api는 참조가 고정돼 있어야 한다. */
export function useVisits(api: VisitsApi, matchId: number) {
  const [state, setState] = useState<VisitsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const { version, writing, refreshRef, write } = useWriteGate();

  useFocusEffect(
    useCallback(() => {
      // 화면을 벗어난 뒤 도착한 응답은 버린다.
      let active = true;
      // 느린 네트워크에서 요청이 쌓이지 않게, 끝나기 전에는 다시 보내지 않는다.
      let pending: number | null = null;
      const refresh = (): void => {
        const sentAt = version.current;
        if (writing.current > 0 || pending === sentAt) return;
        pending = sentAt;
        const settle = (next: (previous: VisitsState) => VisitsState): void => {
          if (pending === sentAt) pending = null;
          if (active && sentAt === version.current) setState(next);
        };
        api.list(matchId).then(
          (visits) =>
            settle(() => ({ status: "ready", visits, refreshError: null })),
          (error: unknown) =>
            settle((previous) => withFailure(previous, error)),
        );
      };
      refreshRef.current = refresh;
      const poll = pollWhileActive(refresh, POLL_INTERVAL_MS);
      return () => {
        active = false;
        refreshRef.current = () => {};
        poll.stop();
      };
    }, [api, matchId, attempt]),
  );

  const retry = (): void => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  };

  const updateVisit = useCallback(
    (visitId: number, changes: Partial<VisitRecord>): void =>
      setState((previous) => withChanges(previous, visitId, changes)),
    [],
  );

  return { state, retry, write, updateVisit };
}
