import type {
  ChatLanguage,
  ChatLocalizedText,
  ChatMessageView,
  ChatMatchView,
} from "./viewTypes";

export type MatchStatus =
  | "MATCHED"
  | "ON_COURSE"
  | "COMPLETED"
  | "CANCELED"
  | "EXPIRED"
  | "BLOCKED"
  | "ENDED";
export type ChatStatus = "LOCKED" | "READY" | "OPEN";
export type Match = {
  matchId: number;
  status: MatchStatus;
  chatStatus: ChatStatus;
  partner: {
    userId: string;
    nickname: string | null;
    profileImageUrl: string | null;
  };
  courseMap: { mapId: number; title: string | ChatLocalizedText } | null;
  progress: { visited: number; required: number | null; total: number } | null;
};
export type MatchDetail = Match & {
  chat: { status: ChatStatus; canOpen: boolean };
};
export class InvalidChatResponse extends Error {
  constructor() {
    super("Invalid chat response");
  }
}
function bad(): never {
  throw new InvalidChatResponse();
}
function obj(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : bad();
}
function str(v: unknown): string {
  return typeof v === "string" ? v : bad();
}
function nullable<T>(v: unknown, f: (x: unknown) => T): T | null {
  return v === null ? null : f(v);
}
function count(v: unknown): number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : bad();
}
export function id(v: unknown): number {
  const n = count(v);
  return n > 0 ? n : bad();
}
function uuid(v: unknown): string {
  const s = str(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  )
    ? s
    : bad();
}
function date(v: unknown): string {
  const s = str(v);
  return Number.isFinite(Date.parse(s)) ? s : bad();
}
function bool(v: unknown): boolean {
  return typeof v === "boolean" ? v : bad();
}
function oneOf<T extends string>(v: unknown, choices: readonly T[]): T {
  return typeof v === "string" && choices.includes(v as T) ? (v as T) : bad();
}
const statuses = [
  "MATCHED",
  "ON_COURSE",
  "COMPLETED",
  "CANCELED",
  "EXPIRED",
  "BLOCKED",
  "ENDED",
] as const;
const chats = ["LOCKED", "READY", "OPEN"] as const;
function localized(v: unknown): ChatLocalizedText {
  const o = obj(v);
  return {
    original: str(o.original),
    translated: nullable(o.translated, str),
    sourceLang: oneOf(o.sourceLang, ["ko", "ja"] as const),
  };
}
export function parseMatch(v: unknown, role: "traveler" | "mate"): Match {
  const o = obj(v),
    p = obj(o.partner);
  const courseMap = nullable(o.courseMap, (value) => {
    const m = obj(value);
    return {
      mapId: id(m.mapId),
      title: role === "mate" ? str(m.title) : localized(m.title),
    };
  });
  const progress = nullable(o.progress, (value) => {
    const p = obj(value);
    return {
      visited: count(p.visited),
      required: nullable(p.required, count),
      total: count(p.total),
    };
  });
  return {
    matchId: id(o.matchId),
    status: oneOf(o.status, statuses),
    chatStatus: oneOf(o.chatStatus, chats),
    partner: {
      userId: uuid(p.userId),
      nickname: nullable(p.nickname, str),
      profileImageUrl: nullable(p.profileImageUrl, str),
    },
    courseMap,
    progress,
  };
}
export function parseDetail(
  v: unknown,
  role: "traveler" | "mate",
): MatchDetail {
  const o = obj(v),
    m = parseMatch(v, role),
    c = obj(o.chat);
  const chat = { status: oneOf(c.status, chats), canOpen: bool(c.canOpen) };
  const expected =
    role === "traveler" &&
    m.chatStatus === "READY" &&
    (m.status === "ON_COURSE" || m.status === "COMPLETED");
  if (chat.status !== m.chatStatus || chat.canOpen !== expected) bad();
  return { ...m, chat };
}
export function parseMessage(v: unknown): ChatMessageView {
  const o = obj(v);
  return {
    messageId: id(o.messageId),
    senderId: uuid(o.senderId),
    mine: bool(o.mine),
    content: localized(o.content),
    createdAt: date(o.createdAt),
    readAt: nullable(o.readAt, date),
  };
}
export function toMatchView(
  m: Match,
  role: "traveler" | "mate",
): ChatMatchView {
  const usable = m.status === "ON_COURSE";
  return {
    matchId: m.matchId,
    partner: m.partner,
    map: m.courseMap,
    progress: m.progress,
    status: m.status === "COMPLETED" || !usable ? "ENDED" : m.chatStatus,
    canMessage: usable && m.chatStatus === "OPEN",
    canOpen: role === "traveler" && usable && m.chatStatus === "READY",
  };
}
export function displayText(
  v: ChatLocalizedText,
  language: ChatLanguage,
): string {
  return v.sourceLang === language ? v.original : (v.translated ?? v.original);
}
