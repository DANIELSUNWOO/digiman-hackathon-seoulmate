import { apiRequest, ApiError } from "../../api";
import { positiveId, type MapPreview } from "./model";
import { createMapBrowseApi, type GetRequest } from "./api";

export type ActiveMatch = {
  matchId: number;
  mapId: number | null;
  title: string;
  partner: string | null;
  visited: number | null;
  required: number | null;
  total: number | null;
};
export function parseActiveMatches(value: unknown): ActiveMatch[] {
  if (!Array.isArray(value)) throw new Error("Invalid matches response");
  const ids = new Set<number>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid match");
    const v = item as Record<string, unknown>;
    if (
      (v.status !== "MATCHED" && v.status !== "ON_COURSE") ||
      (v.courseMap !== null &&
        (!v.courseMap || typeof v.courseMap !== "object"))
    )
      throw new Error("Invalid active match");
    const matchId = positiveId(v.matchId);
    const mapId =
      v.courseMap === null
        ? null
        : positiveId((v.courseMap as Record<string, unknown>).mapId);
    if (ids.has(matchId)) throw new Error("Duplicate match");
    ids.add(matchId);
    const title =
      v.courseMap === null
        ? null
        : (v.courseMap as Record<string, unknown>).title;
    const localized =
      title && typeof title === "object"
        ? (title as Record<string, unknown>)
        : null;
    const display =
      typeof localized?.translated === "string" && localized.translated
        ? localized.translated
        : typeof localized?.original === "string"
          ? localized.original
          : typeof title === "string"
            ? title
            : "";
    const partner =
      v.partner && typeof v.partner === "object"
        ? (v.partner as Record<string, unknown>).nickname
        : null;
    const progress =
      v.progress && typeof v.progress === "object"
        ? (v.progress as Record<string, unknown>)
        : null;
    const visited =
      typeof progress?.visited === "number" &&
      Number.isSafeInteger(progress.visited) &&
      progress.visited >= 0
        ? progress.visited
        : null;
    const required =
      typeof progress?.required === "number" &&
      Number.isSafeInteger(progress.required) &&
      progress.required >= 0
        ? progress.required
        : null;
    const total =
      typeof progress?.total === "number" &&
      Number.isSafeInteger(progress.total) &&
      progress.total >= 0
        ? progress.total
        : null;
    return {
      matchId,
      mapId,
      title: display,
      partner: typeof partner === "string" ? partner : null,
      visited,
      required,
      total,
    };
  });
}
const defaultRequest: GetRequest = (path, init, token) =>
  apiRequest(path, init, token);
function requireToken(token: string): void {
  if (typeof token !== "string" || !token.trim())
    throw new Error("Token required");
}
export function createMatchApi(request: GetRequest = defaultRequest) {
  const browse = createMapBrowseApi(request);
  return {
    async active(token: string, signal?: AbortSignal) {
      requireToken(token);
      return parseActiveMatches(
        await request(
          "/matches?state=active",
          { method: "GET", signal },
          token,
        ),
      );
    },
    async slots(token: string, account: string, signal?: AbortSignal) {
      requireToken(token);
      const value = await request(
        "/users/me",
        { method: "GET", signal },
        token,
      );
      if (!value || typeof value !== "object")
        throw new Error("Invalid member response");
      const v = value as Record<string, unknown>;
      if (v.userId !== account || !v.slots || typeof v.slots !== "object")
        throw new Error("Invalid slots");
      const slots = v.slots as Record<string, unknown>;
      if (
        typeof slots.total !== "number" ||
        !Number.isSafeInteger(slots.total) ||
        slots.total < 0 ||
        typeof slots.used !== "number" ||
        !Number.isSafeInteger(slots.used) ||
        slots.used < 0 ||
        slots.used > slots.total
      )
        throw new Error("Invalid slots");
      return { total: slots.total, used: slots.used };
    },
    preview: browse.preview,
    async select(token: string, mapId: number, signal?: AbortSignal) {
      requireToken(token);
      positiveId(mapId);
      return request(
        "/matches",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mapId }),
          signal,
        },
        token,
      );
    },
    async cancel(token: string, matchId: number, signal?: AbortSignal) {
      requireToken(token);
      positiveId(matchId);
      return request(
        `/matches/${matchId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal,
        },
        token,
      );
    },
  };
}
export type MatchApi = ReturnType<typeof createMatchApi>;
export type ConfirmedMatch = { preview: MapPreview; active: ActiveMatch[] };
export type ChangedMatch = ConfirmedMatch & {
  writeSucceeded: boolean;
  confirmedMatchId: number | null;
};
function parseWrite(value: unknown, mapId: number, oldId: number | null) {
  if (!value || typeof value !== "object")
    throw new Error("Invalid write response");
  const v = value as Record<string, unknown>;
  const id = positiveId(v.matchId);
  if (oldId === null) {
    if (
      v.status !== "ON_COURSE" ||
      !v.courseMap ||
      typeof v.courseMap !== "object" ||
      positiveId((v.courseMap as Record<string, unknown>).mapId) !== mapId
    )
      throw new Error("Invalid selection response");
  } else if (id !== oldId || v.status !== "CANCELED")
    throw new Error("Invalid cancellation response");
  if (!v.slots || typeof v.slots !== "object")
    throw new Error("Invalid write slots");
  const slots = v.slots as Record<string, unknown>;
  if (
    typeof slots.total !== "number" ||
    !Number.isSafeInteger(slots.total) ||
    slots.total < 0 ||
    typeof slots.used !== "number" ||
    !Number.isSafeInteger(slots.used) ||
    slots.used < 0 ||
    slots.used > slots.total
  )
    throw new Error("Invalid write slots");
  return id;
}
export function createMatchFlow(api: MatchApi) {
  let busy = false;
  async function verify(
    token: string,
    mapId: number,
    signal?: AbortSignal,
  ): Promise<ConfirmedMatch> {
    const [preview, active] = await Promise.all([
      api.preview(token, mapId, signal),
      api.active(token, signal),
    ]);
    const found = active.filter((m) => m.mapId === mapId);
    if (
      found.length > 1 ||
      (found[0]?.matchId ?? null) !== preview.myMatchId ||
      preview.slots.used !== active.length ||
      preview.slots.used > preview.slots.total
    )
      throw new Error("Match state could not be confirmed");
    return { preview, active };
  }
  async function change(
    token: string,
    mapId: number,
    matchId: number | null,
    isCurrent: () => boolean = () => true,
    signal?: AbortSignal,
  ): Promise<ChangedMatch> {
    if (busy) throw new Error("Match request already in progress");
    busy = true;
    try {
      const current = () => isCurrent() && !signal?.aborted;
      if (!current()) throw new Error("Account or screen changed");
      const before = await verify(token, mapId, signal);
      if (!current()) throw new Error("Account or screen changed");
      if (before.preview.myMatchId !== matchId)
        throw new Error("Match state changed");
      if (
        matchId === null &&
        before.preview.slots.used >= before.preview.slots.total
      )
        throw new Error("No free slot");
      let writeSucceeded = false;
      let responseId: number | null = null;
      try {
        const raw =
          matchId === null
            ? await api.select(token, mapId, signal)
            : await api.cancel(token, matchId, signal);
        if (!current()) throw new Error("Account or screen changed");
        responseId = parseWrite(raw, mapId, matchId);
        writeSucceeded = true;
      } catch (error) {
        const e = error as ApiError;
        const code = e.serverError?.code;
        if (!(
          e.code === "NETWORK" ||
          e.code === "TIMEOUT" ||
          code === "MAP_ALREADY_SELECTED" ||
          code === "MATCH_NOT_ACTIVE"
        ))
          throw error;
      }
      if (!current()) throw new Error("Account or screen changed");
      const after = await verify(token, mapId, signal);
      if (!current()) throw new Error("Account or screen changed");
      if (
        matchId === null
          ? after.preview.myMatchId === null
          : after.active.some((x) => x.matchId === matchId)
      )
        throw new Error("Match change could not be confirmed");
      if (
        writeSucceeded &&
        matchId === null &&
        after.preview.myMatchId !== responseId
      )
        throw new Error("Selection response does not match current state");
      return {
        ...after,
        writeSucceeded,
        confirmedMatchId:
          writeSucceeded && matchId === null ? responseId : null,
      };
    } finally {
      busy = false;
    }
  }
  return { verify, change };
}
