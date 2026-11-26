import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; data: T };

/** 화면에 들어올 때마다 다시 불러온다. load는 참조가 고정돼 있어야 한다. */
export function useLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load().then(
        (data) => {
          if (active) setState({ status: "ready", data });
        },
        (error: unknown) => {
          if (active) setState({ status: "error", error });
        },
      );
      return () => {
        active = false;
      };
    }, [load, attempt]),
  );

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  };

  return { state, retry };
}
