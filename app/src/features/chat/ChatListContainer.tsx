import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useChatList } from "./hooks";
import { chatIdentityFromFlow } from "./identity";
import { useSession } from "../../session";
import { ChatListView } from "./ui";
import { useNavigationLock } from "./useNavigationLock";
import { createChatApi } from "./api";

const api = createChatApi();

type Identity = NonNullable<ReturnType<typeof chatIdentityFromFlow>>;
export function ChatListContainer({
  identity,
  mapId,
}: {
  identity: Identity;
  mapId?: number;
}) {
  const router = useRouter();
  const navigate = useNavigationLock();
  const [selected, setSelected] = useState<number | null>(mapId ?? null);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const catalogRetry = useRef<string | null>(null);
  const [catalog, setCatalog] = useState<{
    owner: string;
    maps: { mapId: number; title: string }[];
    error: boolean;
  } | null>(null);
  const owner = JSON.stringify([
    identity.accountId,
    identity.role,
    identity.token,
  ]);
  const selectionKey = JSON.stringify([owner, mapId, selected]);
  const current = useRef({ key: selectionKey, revision: 0 });
  if (current.current.key !== selectionKey)
    current.current = {
      key: selectionKey,
      revision: current.current.revision + 1,
    };
  const revision = current.current.revision;
  const visibleCatalog = catalog?.owner === owner ? catalog : null;
  useEffect(() => {
    setSelected(mapId ?? null);
  }, [mapId]);
  useEffect(() => {
    if (identity.role !== "mate") {
      setCatalog(null);
      return;
    }
    const abort = new AbortController();
    let alive = true;
    setCatalog(null);
    void api.myMaps(identity.token, abort.signal).then(
      (maps) => {
        if (alive) {
          if (catalogRetry.current === owner) catalogRetry.current = null;
          setCatalog({ owner, maps, error: false });
        }
      },
      () => {
        if (alive) {
          if (catalogRetry.current === owner) catalogRetry.current = null;
          setCatalog({ owner, maps: [], error: true });
        }
      },
    );
    return () => {
      alive = false;
      abort.abort();
    };
  }, [owner, catalogRevision]);
  const props = useChatList({
    ...identity,
    mapId: identity.role === "mate" ? (selected ?? undefined) : undefined,
    onBack: () =>
      navigate(() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)"),
      ),
    onSelect: (matchId) =>
      navigate(() =>
        router.push({
          pathname: "/chats/[matchId]",
          params: { matchId: String(matchId) },
        }),
      ),
  });
  if (identity.role === "mate") {
    const refreshMatches = props.onRefresh;
    props.onRefresh = () => {
      if (
        current.current.key !== selectionKey ||
        current.current.revision !== revision
      )
        return;
      refreshMatches();
      if (visibleCatalog?.error && catalogRetry.current !== owner) {
        catalogRetry.current = owner;
        setCatalogRevision((value) => value + 1);
      }
    };
    props.mapTabs = visibleCatalog?.maps ?? [];
    props.selectedMapId = selected;
    props.onSelectMap = (value) => {
      if (
        current.current.key !== selectionKey ||
        current.current.revision !== revision
      )
        return;
      if (value === selected) return;
      if (
        value !== null &&
        (!Number.isSafeInteger(value) ||
          value <= 0 ||
          !visibleCatalog?.maps.some((map) => map.mapId === value))
      )
        return;
      current.current.revision++;
      setSelected(value);
    };
    if (visibleCatalog?.error)
      props.notice =
        "지도 목록을 불러오지 못했습니다. 전체 대화는 볼 수 있습니다.";
  }
  return <ChatListView {...props} />;
}

/** The layout validates the session; keep the child mounted only while it stays valid. */
export function SessionChatList({ mapId }: { mapId?: number }) {
  const flow = useSession();
  const identity = chatIdentityFromFlow(flow);
  return identity ? (
    <ChatListContainer
      key={JSON.stringify([identity.accountId, identity.role])}
      identity={identity}
      mapId={mapId}
    />
  ) : null;
}
