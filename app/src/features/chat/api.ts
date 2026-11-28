import { apiRequest } from "../../api";
import { id, parseDetail, parseMatch, parseMessage } from "./model";

export type ChatRequest = (
  path: string,
  init: RequestInit,
  token: string,
) => Promise<unknown>;
const defaultRequest: ChatRequest = (path, init, token) =>
  apiRequest<unknown>(path, init, token);
export type ChatRole = "traveler" | "mate";
function tokenValue(token: string) {
  if (!token.trim()) throw new Error("Token required");
  return token;
}
export function createChatApi(request: ChatRequest = defaultRequest) {
  return {
    async myMaps(token: string, signal?: AbortSignal) {
      const raw = await request(
        "/maps/me",
        { method: "GET", signal },
        tokenValue(token),
      );
      if (!Array.isArray(raw)) throw new Error("Invalid map list");
      const seen = new Set<number>();
      return raw.map((value) => {
        if (!value || typeof value !== "object") throw new Error("Invalid map");
        const map = value as Record<string, unknown>;
        const mapId = id(map.mapId);
        if (
          seen.has(mapId) ||
          typeof map.title !== "string" ||
          !map.title.trim()
        )
          throw new Error("Invalid map");
        seen.add(mapId);
        return { mapId, title: map.title };
      });
    },
    async list(
      token: string,
      role: ChatRole,
      mapId?: number,
      signal?: AbortSignal,
    ) {
      if (mapId !== undefined) {
        id(mapId);
        if (role !== "mate") throw new Error("Map filter requires mate role");
      }
      const raw = await request(
        `/matches${mapId === undefined ? "" : `?mapId=${mapId}`}`,
        { method: "GET", signal },
        tokenValue(token),
      );
      if (!Array.isArray(raw)) throw new Error("Invalid list");
      const rows = raw.map((v) => parseMatch(v, role));
      const seen = new Set<number>();
      for (const row of rows) {
        if (
          seen.has(row.matchId) ||
          (mapId !== undefined && row.courseMap?.mapId !== mapId)
        )
          throw new Error("Invalid match list");
        seen.add(row.matchId);
      }
      return rows;
    },
    async detail(
      token: string,
      role: ChatRole,
      matchId: number,
      signal?: AbortSignal,
    ) {
      id(matchId);
      const result = parseDetail(
        await request(
          `/matches/${matchId}`,
          { method: "GET", signal },
          tokenValue(token),
        ),
        role,
      );
      if (result.matchId !== matchId) throw new Error("Unexpected match ID");
      return result;
    },
    async open(token: string, matchId: number, signal?: AbortSignal) {
      id(matchId);
      const raw = await request(
        `/matches/${matchId}/chat/open`,
        { method: "POST", signal },
        tokenValue(token),
      );
      if (
        !raw ||
        typeof raw !== "object" ||
        (raw as Record<string, unknown>).matchId !== matchId ||
        (raw as Record<string, unknown>).chatStatus !== "OPEN"
      )
        throw new Error("Invalid open response");
    },
    async messages(
      token: string,
      matchId: number,
      after?: number,
      signal?: AbortSignal,
    ) {
      id(matchId);
      if (after !== undefined) id(after);
      const raw = await request(
        `/matches/${matchId}/messages?${after === undefined ? "" : `after=${after}&`}size=50`,
        { method: "GET", signal },
        tokenValue(token),
      );
      if (!Array.isArray(raw) || raw.length > 50)
        throw new Error("Invalid message page");
      const rows = raw.map(parseMessage);
      let cursor = after ?? 0;
      for (const row of rows) {
        if (row.messageId <= cursor) throw new Error("Invalid message cursor");
        cursor = row.messageId;
      }
      return rows;
    },
    async send(
      token: string,
      matchId: number,
      content: string,
      signal?: AbortSignal,
    ) {
      id(matchId);
      const text = content.trim();
      if (!text || text.length > 500)
        throw new RangeError("Invalid message length");
      return parseMessage(
        await request(
          `/matches/${matchId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: text }),
            signal,
          },
          tokenValue(token),
        ),
      );
    },
  };
}
export type ChatApi = ReturnType<typeof createChatApi>;
