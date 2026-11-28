import { useCallback, useEffect, useState } from "react";
import type { AlbumApi } from "./api";
import type { Album } from "./types";

export type AlbumState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; album: Album };

export interface AlbumLoad {
  state: AlbumState;
  retry: () => void;
}

/** 끝난 여행이라 다시 읽지 않는다. api는 참조가 고정돼 있어야 한다. */
export function useAlbum(api: AlbumApi, matchId: number): AlbumLoad {
  const [state, setState] = useState<AlbumState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.get(matchId).then(
      (album) => {
        if (active) setState({ status: "ready", album });
      },
      (error: unknown) => {
        if (active) setState({ status: "error", error });
      },
    );
    return () => {
      active = false;
    };
  }, [api, matchId, attempt]);

  const retry = useCallback((): void => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
