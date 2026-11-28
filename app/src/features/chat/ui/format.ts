import { displayText } from "../model";
import type {
  ChatLanguage,
  ChatMatchView,
  ChatPartnerView,
  ChatProgressView,
} from "../viewTypes";
import { chatStrings } from "./strings";

export function resolvePartnerName(
  partner: ChatPartnerView,
  language: ChatLanguage,
): string {
  const trimmed = partner.nickname?.trim();
  return trimmed ? trimmed : chatStrings[language].fallbackPartner;
}

export function partnerInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const chars = Array.from(trimmed);
  return (chars[0] ?? "?").toUpperCase();
}

export function resolveMapTitle(
  map: ChatMatchView["map"],
  language: ChatLanguage,
): string {
  const fallback = chatStrings[language].fallbackMap;
  if (!map) return fallback;
  const raw =
    typeof map.title === "string"
      ? map.title
      : displayText(map.title, language);
  const trimmed = raw.trim();
  return trimmed ? trimmed : fallback;
}

export type ProgressMetrics = {
  visited: number;
  total: number;
  required: number | null;
  remaining: number | null;
  ratio: number;
  thresholdRatio: number | null;
};

/** Compute progress percentages strictly from backend-provided progress.required. */
export function getProgressMetrics(
  progress: ChatProgressView | null,
): ProgressMetrics | null {
  if (!progress) return null;
  const visited = Math.max(0, progress.visited);
  const total = Math.max(0, progress.total);
  const required =
    progress.required === null ? null : Math.max(0, progress.required);
  const remaining = required === null ? null : Math.max(0, required - visited);
  const ratio = total > 0 ? Math.min(1, Math.max(0, visited / total)) : 0;
  const thresholdRatio =
    required !== null && total > 0 && required <= total
      ? Math.min(1, Math.max(0, required / total))
      : null;
  return {
    visited,
    total,
    required,
    remaining,
    ratio,
    thresholdRatio,
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatMessageTime(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatMessageDateKey(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const KO_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const JA_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function formatMessageDateHeading(
  iso: string,
  language: ChatLanguage,
): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday =
    language === "ko" ? KO_WEEKDAYS[d.getDay()] : JA_WEEKDAYS[d.getDay()];
  return language === "ko"
    ? `${month}월 ${day}일 (${weekday})`
    : `${month}月${day}日(${weekday})`;
}

export function getTrimmedLength(draft: string): number {
  return draft.trim().length;
}
