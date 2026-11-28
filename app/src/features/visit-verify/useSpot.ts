import { useCallback, useEffect, useState } from "react";
import type { VisitVerifyApi } from "./api";
import type { CourseSpot } from "./types";

export type SpotState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; spot: CourseSpot | null };

export interface SpotLoad {
  state: SpotState;
  retry: () => void;
}

/**
 * 한 번만 불러온다. 쓰던 사진과 후기를 지키려고 다시 조회해 덮지 않는다.
 * api는 참조가 고정돼 있어야 한다.
 */
export function useSpot(
  api: VisitVerifyApi,
  matchId: number,
  spotId: number,
): SpotLoad {
  const [state, setState] = useState<SpotState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.getSpot(matchId, spotId).then(
      (spot) => {
        if (active) setState({ status: "ready", spot });
      },
      (error: unknown) => {
        if (active) setState({ status: "error", error });
      },
    );
    return () => {
      active = false;
    };
  }, [api, matchId, spotId, attempt]);

  const retry = useCallback((): void => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
