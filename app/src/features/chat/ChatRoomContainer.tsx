import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { AppState, View } from "react-native";
import { useSession } from "../../session";
import { BottomSheet, Button, Label } from "../../ui";
import { useChatRoom } from "./hooks";
import { chatIdentityFromFlow } from "./identity";
import { ChatOpenSheet, ChatRoomView } from "./ui";
import { useNavigationLock } from "./useNavigationLock";
import { createSafetyApi } from "../safety/api";
import { SafetyController } from "../safety/controller";
import { SafetySheet } from "../safety/SafetySheet";
import { chatTargetForSelection, type ReportTarget } from "../safety/model";

const safetyApi = createSafetyApi();

type Identity = NonNullable<ReturnType<typeof chatIdentityFromFlow>>;
export function ChatRoomContainer({
  identity,
  matchId,
}: {
  identity: Identity;
  matchId: number;
}) {
  const router = useRouter();
  const navigate = useNavigationLock();
  const safetyController = useRef(new SafetyController(safetyApi)).current;
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [safetyVisible, setSafetyVisible] = useState(false);
  const safetyVisibleRef = useRef(false);
  safetyVisibleRef.current = safetyVisible;
  const [safetyClosing, setSafetyClosing] = useState(false);
  const [safetyScope, setSafetyScope] = useState("");
  const [openSheetMounted, setOpenSheetMounted] = useState(false);
  const [blockRevision, setBlockRevision] = useState(0);
  const blockQuery = useRef<{
    generation: number;
    key: string;
    abort: AbortController | null;
  }>({ generation: 0, key: "", abort: null });
  const invalidateBlockQuery = () => {
    blockQuery.current.generation++;
    blockQuery.current.abort?.abort();
    blockQuery.current.abort = null;
  };
  const [target, setTarget] = useState<ReportTarget>({
    type: "PROFILE",
    id: null,
  });
  const [blockState, setBlockState] = useState<{
    key: string;
    value: boolean | null;
  }>({ key: "", value: null });
  const scope = JSON.stringify([
    identity.accountId,
    identity.role,
    identity.token,
    matchId,
  ]);
  const [pending, setPending] = useState<{
    scope: string;
    accept: () => void;
    cancel: () => void;
    visible: boolean;
  } | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const cancel = useCallback(() => {
    const item = pendingRef.current;
    if (!item || !item.visible) return;
    item.cancel();
    setPending((current) =>
      current === item ? { ...item, visible: false } : current,
    );
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        invalidateBlockQuery();
        safetyController.invalidate();
        if (safetyVisibleRef.current) setSafetyClosing(true);
        setSafetyVisible(false);
        cancel();
      };
    }, [cancel, safetyController]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
      if (state !== "active") {
        invalidateBlockQuery();
        safetyController.invalidate();
        if (safetyVisibleRef.current) setSafetyClosing(true);
        setSafetyVisible(false);
        cancel();
      }
    });
    return () => subscription.remove();
  }, [cancel]);
  useEffect(() => {
    if (pendingRef.current?.scope !== scope) cancel();
  }, [scope, cancel]);
  useEffect(() => {
    if (safetyVisibleRef.current && safetyScope !== scope) {
      safetyController.invalidate();
      setSafetyClosing(true);
      setSafetyVisible(false);
    }
  }, [scope, safetyScope, safetyController]);
  const { room, sheet } = useChatRoom({
    ...identity,
    matchId,
    confirm: (_language, accept, onCancel) =>
      setPending({ scope, accept, cancel: onCancel, visible: true }),
    onBack: () =>
      navigate(() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)"),
      ),
  });
  const partnerId = room.match?.partner.userId ?? "";
  const blockKey = JSON.stringify([scope, partnerId]);
  if (blockQuery.current.key !== blockKey) {
    invalidateBlockQuery();
    blockQuery.current.key = blockKey;
  }
  const safetyActive = focused && foreground && !!partnerId;
  safetyController.configure(
    identity.accountId,
    identity.token,
    matchId,
    partnerId,
    safetyActive,
  );
  useEffect(() => {
    if (!safetyActive) return;
    const abort = new AbortController();
    invalidateBlockQuery();
    blockQuery.current.abort = abort;
    const generation = blockQuery.current.generation;
    let current = true;
    setBlockState({ key: blockKey, value: null });
    safetyApi.blocked(identity.token, partnerId, abort.signal).then(
      (value) => {
        if (
          current &&
          !abort.signal.aborted &&
          blockQuery.current.generation === generation &&
          blockQuery.current.key === blockKey
        ) {
          if (value)
            safetyController.noteBlockConfirmed(identity.accountId, matchId);
          const confirmed = safetyController.isBlockConfirmed(
            identity.accountId,
            matchId,
          );
          const unresolved = safetyController.isBlockUnresolved(
            identity.accountId,
            matchId,
          );
          setBlockState({
            key: blockKey,
            value: confirmed || value ? true : unresolved ? null : false,
          });
        }
      },
      () => {
        if (
          current &&
          !abort.signal.aborted &&
          blockQuery.current.generation === generation &&
          blockQuery.current.key === blockKey
        )
          setBlockState({ key: blockKey, value: null });
      },
    );
    return () => {
      current = false;
      if (blockQuery.current.abort === abort) invalidateBlockQuery();
      else abort.abort();
    };
  }, [blockKey, safetyActive, blockRevision]);
  const blocked = blockState.key === blockKey ? blockState.value : null;
  const canInteract =
    blocked === false &&
    !safetyController.isBlockConfirmed(identity.accountId, matchId) &&
    !safetyController.isBlockUnresolved(identity.accountId, matchId);
  const showOpenSheet =
    sheet.visible && canInteract && !safetyVisible && !safetyClosing;
  useEffect(() => {
    if (showOpenSheet) setOpenSheetMounted(true);
  }, [showOpenSheet]);
  const openSafety = (next: ReportTarget) => {
    if (
      !safetyActive ||
      !partnerId ||
      sheet.visible ||
      openSheetMounted ||
      pending ||
      safetyVisible ||
      safetyClosing
    )
      return;
    setTarget(next);
    setSafetyScope(scope);
    setSafetyVisible(true);
  };
  return (
    <>
      <ChatRoomView
        key={JSON.stringify([identity.accountId, identity.role, matchId])}
        {...room}
        match={
          room.match && !canInteract
            ? { ...room.match, canMessage: false, canOpen: false }
            : room.match
        }
        onSend={() => {
          if (
            canInteract &&
            !safetyController.isBlockConfirmed(identity.accountId, matchId) &&
            !safetyController.isBlockUnresolved(identity.accountId, matchId)
          )
            room.onSend();
        }}
        notice={
          blocked === null
            ? identity.language === "ko"
              ? "차단 상태를 확인하지 못했습니다. 새로고침해 주세요."
              : "ブロック状態を確認できません。更新してください。"
            : room.notice
        }
        onRefresh={() => {
          invalidateBlockQuery();
          setBlockRevision((value) => value + 1);
          room.onRefresh();
        }}
        onRequestOpenChat={
          canInteract
            ? () => {
                if (
                  !safetyController.isBlockConfirmed(
                    identity.accountId,
                    matchId,
                  ) &&
                  !safetyController.isBlockUnresolved(
                    identity.accountId,
                    matchId,
                  )
                )
                  room.onRequestOpenChat?.();
              }
            : undefined
        }
        onSafetyMenu={() => openSafety({ type: "PROFILE", id: null })}
        onReportMessage={(message) => {
          const selected =
            room.match &&
            chatTargetForSelection(
              message,
              room.messages,
              partnerId,
              room.match.matchId,
              matchId,
            );
          if (selected) openSafety(selected);
        }}
      />
      <ChatOpenSheet
        key={JSON.stringify([identity.accountId, identity.role, matchId])}
        {...sheet}
        visible={showOpenSheet}
        onDismissed={() => setOpenSheetMounted(false)}
      />
      <BottomSheet
        visible={!!pending?.visible && pending.scope === scope}
        onClose={cancel}
        onDismissed={() =>
          setPending((current) =>
            current && !current.visible ? null : current,
          )
        }
      >
        <View style={{ gap: 12 }}>
          <Label variant="sheetTitle" language={identity.language}>
            {identity.language === "ko"
              ? "재전송을 확인해 주세요"
              : "再送を確認してください"}
          </Label>
          <Label language={identity.language}>
            {identity.language === "ko"
              ? "대화 이력을 먼저 확인해 주세요. 다시 보내면 메시지가 중복될 수 있습니다."
              : "先に会話を確認してください。再送するとメッセージが重複する場合があります。"}
          </Label>
          <Button
            language={identity.language}
            label={identity.language === "ko" ? "다시 보내기" : "再送する"}
            onPress={() => {
              const item = pendingRef.current;
              if (!item?.visible || item.scope !== scope) return;
              setPending({ ...item, visible: false });
              item.accept();
            }}
          />
          <Button
            secondary
            language={identity.language}
            label={identity.language === "ko" ? "취소" : "キャンセル"}
            onPress={cancel}
          />
        </View>
      </BottomSheet>
      <SafetySheet
        visible={safetyVisible && safetyScope === scope}
        active={safetyActive}
        accountId={identity.accountId}
        token={identity.token}
        matchId={matchId}
        partnerId={partnerId}
        language={identity.language}
        target={target}
        controller={safetyController}
        onClose={() => {
          setSafetyVisible(false);
          setSafetyClosing(true);
        }}
        onDismissed={() => setSafetyClosing(false)}
        onBlocked={() => {
          invalidateBlockQuery();
          setBlockState({ key: blockKey, value: true });
          room.onRefresh();
        }}
        onBlockUncertain={() => {
          invalidateBlockQuery();
          setBlockState({ key: blockKey, value: null });
        }}
      />
    </>
  );
}
export function SessionChatRoom({ matchId }: { matchId: number }) {
  const flow = useSession();
  const identity = chatIdentityFromFlow(flow);
  return identity ? (
    <ChatRoomContainer identity={identity} matchId={matchId} />
  ) : null;
}
