import type { EndedMatch, TripRange } from "./types";

/**
 * 앨범이 있는 끝난 여행만 남기고 최근에 끝난 순서로 놓는다.
 * 앨범은 여행 완료와 기간 만료 때 만들어진다 (API 명세 ALBUM-01).
 */
export function albumTrips(matches: readonly EndedMatch[]): EndedMatch[] {
  const endDate = (match: EndedMatch) => match.trip?.endDate ?? "";
  return matches
    .filter(({ status }) => status === "COMPLETED" || status === "EXPIRED")
    .sort((a, b) => endDate(b).localeCompare(endDate(a)));
}

/** "12월 3일~8일". 달이 바뀌면 "11월 28일~12월 3일" */
export function tripLabel({ startDate, endDate }: TripRange): string {
  const [, startMonth, startDay] = startDate.split("-").map(Number);
  const [, endMonth, endDay] = endDate.split("-").map(Number);
  const end =
    startMonth === endMonth ? `${endDay}일` : `${endMonth}월 ${endDay}일`;
  return `${startMonth}월 ${startDay}일~${end}`;
}
