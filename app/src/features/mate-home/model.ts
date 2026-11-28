import { strings } from "./strings";
import type { MapInput, MatchItem, MyMap } from "./types";

// 서버 정책값의 앱 사본. 부족한 조건을 안내하는 데만 쓰고, 노출 판정은 서버의 isPublic을 따른다.
export const MAP_MIN_SPOTS = 5;
export const MAP_PREVIEW_SPOTS = 2;
export const MAP_TITLE_MAX = 30;
export const MAP_CAPTION_MAX = 300;

export function spotLabel(map: Pick<MyMap, "spotCount">): string {
  return map.spotCount >= MAP_MIN_SPOTS
    ? strings.spotCount(map.spotCount)
    : strings.spotShortage(map.spotCount, MAP_MIN_SPOTS);
}

export function previewLabel(map: Pick<MyMap, "previewCount">): string {
  return strings.previewCount(map.previewCount, MAP_PREVIEW_SPOTS);
}

export type HomeKind = "matched" | "waiting" | "unpublished";

export function homeKind(
  matches: readonly MatchItem[],
  maps: readonly MyMap[],
): HomeKind {
  if (matches.length > 0) return "matched";
  return maps.some((map) => map.isPublic) ? "waiting" : "unpublished";
}

/** 채팅까지 남은 인증 수. 채팅을 열 수 있으면 0, 알 수 없으면 null */
export function chatRemaining({
  chatStatus,
  progress,
}: MatchItem): number | null {
  // 채팅을 열 수 있는지는 서버 상태를 따른다. 숫자는 남은 곳 수를 보여 줄 때만 쓴다.
  if (chatStatus !== "LOCKED") return 0;
  if (!progress || progress.required === null) return null;
  const remaining = progress.required - progress.visited;
  return remaining > 0 ? remaining : null;
}

/** "방금", "5분 전", "3시간 전", "2일 전". 일주일이 지나면 "11월 29일" */
export function relativeTime(dateTime: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(dateTime)) / 60_000);
  if (minutes < 1) return strings.justNow;
  if (minutes < 60) return strings.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return strings.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return strings.daysAgo(days);
  // 서버가 KST(+09:00)로 내려주므로 문자열에서 잘라 쓴다.
  const [, month, day] = dateTime.slice(0, 10).split("-").map(Number);
  return strings.monthDay(month, day);
}

/** 최근에 인증한 여행자가 위로 온다 (M-20 최근 방문). */
export function sortByLastVisit(matches: readonly MatchItem[]): MatchItem[] {
  const time = (match: MatchItem) =>
    match.lastVisitAt ? Date.parse(match.lastVisitAt) : 0;
  return [...matches].sort((a, b) => time(b) - time(a));
}

/** 마지막 인증이 가장 최근인 여행자. 아무도 인증하지 않았으면 null */
export function latestVisited(matches: readonly MatchItem[]): MatchItem | null {
  const [first] = sortByLastVisit(matches);
  return first?.lastVisitAt ? first : null;
}

/** 노출 조건을 가장 많이 채운 지도. 지도가 없으면 null */
export function closestToExposure(maps: readonly MyMap[]): MyMap | null {
  const score = (map: MyMap) =>
    Math.min(map.spotCount, MAP_MIN_SPOTS) +
    Math.min(map.previewCount, MAP_PREVIEW_SPOTS);
  return [...maps].sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** 수정 요청에는 바뀐 값만 담는다. */
export function changedFields(
  before: MapInput,
  after: MapInput,
): Partial<MapInput> {
  return {
    ...(before.title !== after.title && { title: after.title }),
    ...(before.caption !== after.caption && { caption: after.caption }),
  };
}
