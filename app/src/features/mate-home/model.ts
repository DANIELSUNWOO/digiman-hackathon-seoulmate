import { strings } from "./strings";
import type { MatchItem, MyMap } from "./types";

// 서버 정책값의 앱 사본. 부족한 조건을 안내하는 데만 쓰고, 노출 판정은 서버의 isPublic을 따른다.
const MAP_MIN_SPOTS = 5;
const MAP_PREVIEW_SPOTS = 2;

export function spotLabel(map: MyMap): string {
  return map.spotCount >= MAP_MIN_SPOTS
    ? strings.spotCount(map.spotCount)
    : strings.spotShortage(map.spotCount, MAP_MIN_SPOTS);
}

export function previewLabel(map: MyMap): string {
  return strings.previewCount(map.previewCount, MAP_PREVIEW_SPOTS);
}

export function progressLabel({ progress, chatStatus }: MatchItem): string {
  if (!progress) return strings.courseNotSelected;
  const visited = strings.visited(progress.visited, progress.total);
  // 채팅을 열 수 있는지는 서버 상태를 따른다. 숫자는 남은 곳 수를 보여 줄 때만 쓴다.
  if (chatStatus === "OPEN") return `${visited} · ${strings.chatOpen}`;
  if (chatStatus === "READY") return `${visited} · ${strings.chatReady}`;
  if (progress.required === null) return visited;
  const remaining = progress.required - progress.visited;
  return remaining > 0
    ? `${visited} · ${strings.chatRemaining(remaining)}`
    : visited;
}

/** 서버가 KST(+09:00)로 내려주므로 문자열에서 잘라 쓴다. */
export function visitTimeLabel(lastVisitAt: string | null): string {
  if (!lastVisitAt) return strings.noVisit;
  const month = lastVisitAt.slice(5, 7);
  const day = lastVisitAt.slice(8, 10);
  return strings.lastVisit(`${month}/${day} ${lastVisitAt.slice(11, 16)}`);
}

/** 최근에 인증한 여행자가 위로 온다 (M-20 최근 방문). */
export function sortByLastVisit(matches: readonly MatchItem[]): MatchItem[] {
  const time = (match: MatchItem) =>
    match.lastVisitAt ? Date.parse(match.lastVisitAt) : 0;
  return [...matches].sort((a, b) => time(b) - time(a));
}
