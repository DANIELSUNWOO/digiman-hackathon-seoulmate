import { useCallback, useEffect, useState } from "react";
import type { ReviewApi } from "./api";
import type { Review } from "./types";

export type ReviewsState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; reviews: Review[] };

export interface ReviewsLoad {
  state: ReviewsState;
  retry: () => void;
  /** 보고 있던 화면과 입력을 둔 채 다시 읽는다. */
  refresh: () => void;
  /** 방금 보낸 후기를 다시 조회하지 않고 목록에 더한다. */
  add: (review: Review) => void;
}

/** api는 참조가 고정돼 있어야 한다. */
export function useReviews(api: ReviewApi, matchId: number): ReviewsLoad {
  const [state, setState] = useState<ReviewsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.list(matchId).then(
      (reviews) => {
        if (active) setState({ status: "ready", reviews });
      },
      (error: unknown) => {
        if (!active) return;
        setState((previous) =>
          previous.status === "ready" ? previous : { status: "error", error },
        );
      },
    );
    return () => {
      active = false;
    };
  }, [api, matchId, attempt]);

  const refresh = useCallback((): void => {
    setAttempt((value) => value + 1);
  }, []);

  const retry = useCallback((): void => {
    setState({ status: "loading" });
    refresh();
  }, [refresh]);

  const add = useCallback((review: Review): void => {
    setState((previous) =>
      previous.status === "ready"
        ? { status: "ready", reviews: [...previous.reviews, review] }
        : previous,
    );
  }, []);

  return { state, retry, refresh, add };
}
