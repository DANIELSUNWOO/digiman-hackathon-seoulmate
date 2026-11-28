import { Redirect, useLocalSearchParams } from "expo-router";
import { useSession } from "../../src/session";
import { parseChatRouteId } from "../../src/features/chat/navigation";
import { SessionChatList } from "../../src/features/chat/ChatListContainer";

export default function ChatListRoute() {
  const { mapId } = useLocalSearchParams<{ mapId?: string | string[] }>();
  const flow = useSession();
  const parsed = mapId === undefined ? undefined : parseChatRouteId(mapId);
  if (
    parsed === null ||
    (parsed !== undefined &&
      (flow.load.kind !== "ready" || flow.load.me.role !== "MATE"))
  )
    return <Redirect href="/(tabs)" />;
  return <SessionChatList mapId={parsed} />;
}
