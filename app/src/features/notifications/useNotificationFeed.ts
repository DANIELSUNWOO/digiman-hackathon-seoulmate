import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { NotificationsApi } from "./api";
import { appendPage, withAllRead, withReadFlag } from "./model";
import type { NotificationItem, NotificationPage } from "./types";

export type FeedState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; page: NotificationPage };

export interface NotificationFeed {
  state: FeedState;
  /** 목록은 남긴 채 알려야 하는 실패 (새로고침, 더 보기, 읽음 처리) */
  actionError: unknown;
  loadingMore: boolean;
  markingAll: boolean;
  retry: () => void;
  loadMore: () => void;
  markRead: (item: NotificationItem) => void;
  markAllRead: () => void;
}

type SetFeed = Dispatch<SetStateAction<FeedState>>;

function updatePage(
  setState: SetFeed,
  change: (page: NotificationPage) => NotificationPage,
): void {
  setState((previous) =>
    previous.status === "ready"
      ? { status: "ready", page: change(previous.page) }
      : previous,
  );
}

type SetActionError = (error: unknown) => void;

/** 다음 페이지를 불러온다. reset을 부르면 진행 중인 요청의 응답은 버린다. */
function useMorePages(
  api: NotificationsApi,
  state: FeedState,
  setState: SetFeed,
  setActionError: SetActionError,
) {
  const [loadingMore, setLoadingMore] = useState(false);
  // 진행 중인 요청의 번호. 연속으로 눌러도 한 번만 보낸다.
  const pending = useRef<number | null>(null);
  const sequence = useRef(0);

  const reset = useCallback((): void => {
    pending.current = null;
    setLoadingMore(false);
  }, []);

  const loadMore = (): void => {
    if (state.status !== "ready" || pending.current !== null) return;
    const { nextCursor } = state.page;
    if (nextCursor === null) return;
    const request = ++sequence.current;
    pending.current = request;
    setLoadingMore(true);
    setActionError(null);
    api.list(nextCursor).then(
      (next) => {
        if (pending.current !== request) return;
        updatePage(setState, (page) => appendPage(page, next));
        reset();
      },
      (error: unknown) => {
        if (pending.current !== request) return;
        setActionError(error);
        reset();
      },
    );
  };

  return { loadingMore, loadMore, reset };
}

function useFeedPages(api: NotificationsApi, setActionError: SetActionError) {
  const [state, setState] = useState<FeedState>({ status: "loading" });
  // 새로 불러오기 시작하면 앞선 요청의 응답은 버린다.
  const generation = useRef(0);
  const { loadingMore, loadMore, reset } = useMorePages(
    api,
    state,
    setState,
    setActionError,
  );

  const refresh = useCallback(() => {
    const current = ++generation.current;
    reset();
    setActionError(null);
    api.list(null).then(
      (page) => {
        if (current === generation.current) setState({ status: "ready", page });
      },
      (error: unknown) => {
        if (current !== generation.current) return;
        // 이미 보고 있던 목록은 에러 화면으로 바꾸지 않는다.
        setActionError(error);
        setState((previous) =>
          previous.status === "ready" ? previous : { status: "error", error },
        );
      },
    );
  }, [api, reset, setActionError]);

  return { state, setState, loadingMore, refresh, loadMore };
}

function useReadActions(
  api: NotificationsApi,
  setState: SetFeed,
  setActionError: SetActionError,
) {
  const [markingAll, setMarkingAll] = useState(false);

  // 누르면 바로 다른 화면으로 가므로 먼저 읽음으로 바꾸고, 실패하면 되돌린다.
  const markRead = ({ notificationId, isRead }: NotificationItem): void => {
    if (isRead) return;
    setActionError(null);
    updatePage(setState, (page) => withReadFlag(page, notificationId, true));
    api.markRead(notificationId).catch((error: unknown) => {
      updatePage(setState, (page) => withReadFlag(page, notificationId, false));
      setActionError(error);
    });
  };

  const markAllRead = async (): Promise<void> => {
    setMarkingAll(true);
    setActionError(null);
    try {
      await api.markAllRead();
      updatePage(setState, withAllRead);
    } catch (error: unknown) {
      setActionError(error);
    } finally {
      setMarkingAll(false);
    }
  };

  return { markingAll, markRead, markAllRead };
}

/** 화면에 들어올 때마다 첫 페이지를 다시 불러온다. api는 참조가 고정돼 있어야 한다. */
export function useNotificationFeed(api: NotificationsApi): NotificationFeed {
  const [actionError, setActionError] = useState<unknown>(null);
  const { state, setState, loadingMore, refresh, loadMore } = useFeedPages(
    api,
    setActionError,
  );
  const read = useReadActions(api, setState, setActionError);

  useFocusEffect(refresh);

  const retry = (): void => {
    setState({ status: "loading" });
    refresh();
  };

  return { state, actionError, loadingMore, retry, loadMore, ...read };
}
