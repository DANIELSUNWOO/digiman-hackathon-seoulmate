import { apiRequest } from "../../api";
import { id, parseMatch } from "../chat/model";

export type Request = (
  path: string,
  init: RequestInit,
  token: string,
) => Promise<unknown>;
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("Invalid response");
  return v as Record<string, unknown>;
};
const count = (v: unknown): number => {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0)
    throw new Error("Invalid count");
  return v;
};
export type Detail = ReturnType<typeof parseMatch> & { albumId: number | null };
export type Album = {
  albumId: number;
  title: string;
  coverUrl: string | null;
  photos: string[];
};
export function createCompletionApi(
  request: Request = (path, init, token) => apiRequest(path, init, token),
) {
  const get = (path: string, token: string, signal?: AbortSignal) =>
    request(path, { method: "GET", signal }, token);
  return {
    async detail(
      token: string,
      matchId: number,
      signal?: AbortSignal,
    ): Promise<Detail> {
      if (!token.trim()) throw new Error("Token required");
      id(matchId);
      const raw = await get(`/matches/${matchId}`, token, signal),
        o = object(raw);
      const match = parseMatch(raw, "traveler");
      if (match.matchId !== matchId) throw new Error("Wrong match");
      return { ...match, albumId: o.albumId === null ? null : id(o.albumId) };
    },
    async slots(token: string, account: string, signal?: AbortSignal) {
      const me = object(await get("/users/me", token, signal));
      if (me.userId !== account || me.role !== "TRAVELER")
        throw new Error("Wrong account");
      const slots = object(me.slots),
        total = count(slots.total),
        used = count(slots.used);
      if (used > total) throw new Error("Invalid slots");
      return { total, used };
    },
    async album(
      token: string,
      matchId: number,
      expectedId: number,
      signal?: AbortSignal,
    ): Promise<Album> {
      const o = object(
        await get(`/matches/${id(matchId)}/album`, token, signal),
      );
      if (
        id(o.albumId) !== expectedId ||
        typeof o.title !== "string" ||
        (o.coverUrl !== null && typeof o.coverUrl !== "string") ||
        !Array.isArray(o.items)
      )
        throw new Error("Invalid album");
      const photos = o.items
        .map((item: unknown) => object(item).photoUrl)
        .filter(
          (x: unknown): x is string => typeof x === "string" && x.length > 0,
        );
      return {
        albumId: expectedId,
        title: o.title,
        coverUrl: o.coverUrl as string | null,
        photos,
      };
    },
    async complete(token: string, matchId: number, signal?: AbortSignal) {
      const o = object(
        await request(
          `/matches/${id(matchId)}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
            signal,
          },
          token,
        ),
      );
      const slots = object(o.slots),
        total = count(slots.total),
        used = count(slots.used);
      if (id(o.matchId) !== matchId || o.status !== "COMPLETED" || used > total)
        throw new Error("Invalid completion response");
      return { albumId: id(o.albumId), slots: { total, used } };
    },
    async edit(
      token: string,
      matchId: number,
      title: string,
      coverUrl: string | null,
      signal?: AbortSignal,
    ) {
      const body: { title: string; coverUrl?: string } = { title };
      if (coverUrl !== null) body.coverUrl = coverUrl;
      return request(
        `/matches/${id(matchId)}/album`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        },
        token,
      );
    },
  };
}
export type CompletionApi = ReturnType<typeof createCompletionApi>;
