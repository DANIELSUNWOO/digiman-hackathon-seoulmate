import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { createChatApi, type ChatApi, type ChatRole } from "./api";
import { ChatRoomController, type RoomState } from "./controller";
import { ChatListController, type ChatListState } from "./listController";
import { toMatchView } from "./model";
import type {
  ChatLanguage,
  ChatListViewProps,
  ChatOpenSheetProps,
  ChatRoomViewProps,
} from "./viewTypes";

const api = createChatApi();
type Identity = {
  accountId: string | null;
  token: string | null;
  role: ChatRole;
  language: ChatLanguage;
};
type Confirm = (
  language: ChatLanguage,
  accept: () => void,
  cancel: () => void,
) => void;
const defaultConfirm: Confirm = (language, accept, cancel) => {
  const ko = language === "ko";
  Alert.alert(
    ko ? "전송 결과 확인" : "送信結果の確認",
    ko
      ? "대화 내역을 확인해 주세요. 다시 보내면 같은 메시지가 중복될 수 있습니다."
      : "会話を確認してください。再送すると同じメッセージが重複する場合があります。",
    [
      { text: ko ? "취소" : "キャンセル", style: "cancel", onPress: cancel },
      { text: ko ? "다시 보내기" : "再送する", onPress: accept },
    ],
    { cancelable: true, onDismiss: cancel },
  );
};
function useVisibility() {
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const live = useRef({
    focused: false,
    foreground: AppState.currentState === "active",
    revision: 0,
  });
  useFocusEffect(
    useCallback(() => {
      live.current.focused = true;
      live.current.revision++;
      setFocused(true);
      return () => {
        live.current.focused = false;
        live.current.revision++;
        setFocused(false);
      };
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      live.current.foreground = state === "active";
      live.current.revision++;
      setForeground(state === "active");
    });
    return () => sub.remove();
  }, []);
  return { focused, foreground, live };
}
function message(language: ChatLanguage) {
  return language === "ko"
    ? "요청을 처리하지 못했습니다. 다시 시도해 주세요."
    : "リクエストを処理できませんでした。もう一度お試しください。";
}
function moreNotice(language: ChatLanguage) {
  return language === "ko"
    ? "이전 대화를 불러오고 있습니다."
    : "以前の会話を読み込んでいます。";
}
function useCallbackGuard<T>(
  identity: string,
  controller: { current: T | null },
  boundIdentity: { current: string | null },
  visibility: {
    current: { focused: boolean; foreground: boolean; revision: number };
  },
) {
  const current = useRef({ identity, revision: 0 });
  if (current.current.identity !== identity)
    current.current = { identity, revision: current.current.revision + 1 };
  const revision = current.current.revision;
  const visibilityRevision = visibility.current.revision;
  const captured = controller.current;
  return () =>
    !!captured &&
    controller.current === captured &&
    boundIdentity.current === identity &&
    current.current.identity === identity &&
    current.current.revision === revision &&
    visibility.current.focused &&
    visibility.current.foreground &&
    visibility.current.revision === visibilityRevision;
}
type ListOptions = Identity & {
  mapId?: number;
  onBack: () => void;
  onSelect: (matchId: number) => void;
  api?: ChatApi;
};
export function useChatList(options: ListOptions): ChatListViewProps {
  const { focused, foreground, live } = useVisibility();
  const ref = useRef<ChatListController | null>(null);
  const identity = JSON.stringify([
    options.accountId,
    options.token,
    options.role,
    options.mapId,
    focused,
    foreground,
  ]);
  const boundIdentity = useRef<string | null>(null);
  const guarded = useCallbackGuard(identity, ref, boundIdentity, live);
  const [snapshot, setSnapshot] = useState<ChatListState | null>(null);
  const latest = useRef(options);
  latest.current = options;
  useEffect(() => {
    const controller = new ChatListController(options.api ?? api, setSnapshot);
    ref.current = controller;
    const o = latest.current;
    boundIdentity.current = identity;
    controller.configure(
      o.accountId,
      o.token,
      o.role,
      o.mapId,
      focused,
      foreground,
    );
    return () => {
      if (ref.current === controller) ref.current = null;
      boundIdentity.current = null;
      controller.dispose();
    };
  }, []);
  useEffect(() => {
    boundIdentity.current = identity;
    ref.current?.configure(
      options.accountId,
      options.token,
      options.role,
      options.mapId,
      focused,
      foreground,
    );
  }, [
    options.accountId,
    options.token,
    options.role,
    options.mapId,
    focused,
    foreground,
  ]);
  const valid =
    !!options.accountId &&
    snapshot?.accountId === options.accountId &&
    snapshot.role === options.role &&
    snapshot.mapId === options.mapId;
  const s = valid ? snapshot : null;
  const currentItems = useRef<number[]>([]);
  currentItems.current = s?.items.map((item) => item.matchId) ?? [];
  return {
    language: options.language,
    state:
      !s || (s.loading && !s.items.length && !s.error)
        ? "loading"
        : s.error && !s.items.length
          ? "error"
          : "ready",
    items: s?.items.map((m) => toMatchView(m, options.role)) ?? [],
    refreshing: !!s?.loading && !!s.items.length,
    error: s?.error ? message(options.language) : null,
    notice: null,
    onBack: () => {
      if (guarded()) options.onBack();
    },
    onRefresh: () => {
      if (guarded() && s) void ref.current?.refresh();
    },
    onSelect: (matchId) => {
      if (
        guarded() &&
        s &&
        Number.isSafeInteger(matchId) &&
        matchId > 0 &&
        currentItems.current.includes(matchId)
      )
        options.onSelect(matchId);
    },
  };
}
type RoomOptions = Identity & {
  matchId: number;
  onBack: () => void;
  api?: ChatApi;
  confirm?: Confirm;
};
type RoomSnapshot = { role: ChatRole; value: RoomState };
export function useChatRoom(options: RoomOptions): {
  room: ChatRoomViewProps;
  sheet: ChatOpenSheetProps;
} {
  const { focused, foreground, live } = useVisibility();
  const ref = useRef<ChatRoomController | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [sheetDismissed, setSheetDismissed] = useState(false);
  const latest = useRef({ ...options, focused, foreground });
  latest.current = { ...options, focused, foreground };
  const identity = `${options.accountId ?? ""}|${options.token ?? ""}|${options.role}|${options.matchId}|${focused}|${foreground}`;
  const boundIdentity = useRef<string | null>(null);
  const guarded = useCallbackGuard(identity, ref, boundIdentity, live);
  const currentIdentity = useRef({ value: identity, revision: 0 });
  if (currentIdentity.current.value !== identity) {
    currentIdentity.current = {
      value: identity,
      revision: currentIdentity.current.revision + 1,
    };
  }
  const confirmation = useRef<{
    identity: string;
    identityRevision: number;
    visibilityRevision: number;
    controller: ChatRoomController;
  } | null>(null);
  const boundRole = useRef(options.role);
  useEffect(() => {
    const controller = new ChatRoomController(options.api ?? api, (value) =>
      setSnapshot({ role: boundRole.current, value }),
    );
    ref.current = controller;
    const o = latest.current;
    boundIdentity.current = identity;
    boundRole.current = o.role;
    controller.configure(
      o.accountId,
      o.token,
      o.role,
      o.matchId,
      o.focused,
      o.foreground,
    );
    return () => {
      confirmation.current = null;
      if (ref.current === controller) ref.current = null;
      boundIdentity.current = null;
      controller.dispose();
    };
  }, []);
  useEffect(() => {
    confirmation.current = null;
    boundRole.current = options.role;
    boundIdentity.current = identity;
    ref.current?.configure(
      options.accountId,
      options.token,
      options.role,
      options.matchId,
      focused,
      foreground,
    );
  }, [identity]);
  useEffect(() => {
    setSheetDismissed(false);
  }, [options.accountId, options.matchId]);
  const valid =
    !!options.accountId &&
    snapshot?.value.accountId === options.accountId &&
    snapshot.value.matchId === options.matchId &&
    snapshot.role === options.role;
  const s = valid ? snapshot.value : null;
  const latestRoom = useRef(s);
  latestRoom.current = s;
  const match = s?.detail ? toMatchView(s.detail, options.role) : null;
  const send = () => {
    const controller = ref.current;
    if (
      !guarded() ||
      !controller ||
      !s ||
      !focused ||
      !foreground ||
      !live.current.focused ||
      !live.current.foreground
    )
      return;
    if (!s.sendUncertain) {
      void controller.send();
      return;
    }
    if (confirmation.current) return;
    const pending = {
      identity,
      identityRevision: currentIdentity.current.revision,
      visibilityRevision: live.current.revision,
      controller,
    };
    confirmation.current = pending;
    const clear = () => {
      if (confirmation.current === pending) confirmation.current = null;
    };
    (options.confirm ?? defaultConfirm)(
      options.language,
      () => {
        if (
          !guarded() ||
          confirmation.current !== pending ||
          currentIdentity.current.value !== pending.identity ||
          currentIdentity.current.revision !== pending.identityRevision ||
          live.current.revision !== pending.visibilityRevision ||
          ref.current !== controller ||
          !live.current.focused ||
          !live.current.foreground
        ) {
          clear();
          return;
        }
        clear();
        controller.acknowledgeUncertainSend();
        void controller.send();
      },
      clear,
    );
  };
  const error = s?.error ? message(options.language) : null;
  const room: ChatRoomViewProps = {
    onRequestOpenChat: () => {
      if (
        latestRoom.current?.detail?.status === "ON_COURSE" &&
        latestRoom.current.detail.chat.canOpen &&
        guarded()
      )
        setSheetDismissed(false);
    },
    language: options.language,
    state:
      !s || (!s.detail && !s.error)
        ? "loading"
        : !s.detail && s.error
          ? "error"
          : "ready",
    match,
    messages: s?.messages ?? [],
    refreshing: !!s?.loading && !!s.detail,
    loadingMore: !!s?.loadingMore || !!s?.backlog,
    error,
    notice: s?.backlog ? moreNotice(options.language) : null,
    draft: s?.draft ?? "",
    sending: !!s?.sending,
    sendUncertain: !!s?.sendUncertain,
    onBack: () => {
      if (guarded()) options.onBack();
    },
    onRefresh: () => {
      if (guarded() && s) void ref.current?.refresh();
    },
    onChangeDraft: (text) => {
      if (s && guarded()) ref.current?.changeDraft(text);
    },
    onSend: send,
  };
  const sheet: ChatOpenSheetProps = {
    language: options.language,
    visible:
      !!s?.detail &&
      s.detail.status === "ON_COURSE" &&
      s.detail.chat.canOpen &&
      !sheetDismissed,
    match,
    opening: !!s?.opening,
    openUncertain: !!s?.openUncertain,
    error,
    onOpenChat: () => {
      if (!s || !guarded()) return;
      if (s?.openUncertain) void ref.current?.refresh();
      else void ref.current?.open();
    },
    onDismiss: () => {
      if (guarded()) setSheetDismissed(true);
    },
  };
  return { room, sheet };
}
