import { Redirect, useLocalSearchParams } from "expo-router";
import { parseChatRouteId } from "../../src/features/chat/navigation";
import { SessionChatRoom } from "../../src/features/chat/ChatRoomContainer";

export default function ChatRoomRoute() {
  const { matchId } = useLocalSearchParams<{ matchId?: string | string[] }>();
  const parsed = parseChatRouteId(matchId);
  if (parsed === null) return <Redirect href="/(tabs)" />;
  return <SessionChatRoom matchId={parsed} />;
}
