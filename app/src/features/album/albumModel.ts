// 앨범 화면에 쓰는 날짜 계산. 서버 날짜는 KST라 문자열에서 잘라 쓴다.
import type { VisitRecord } from "../visits";
import type { TripRange } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AlbumPage =
  { kind: "visit"; visit: VisitRecord } | { kind: "summary" };

export interface CalendarDay {
  month: number;
  day: number;
}

/** 서버는 최근 순으로 준다. 여행한 순서의 방문 카드 뒤에 요약을 붙인다. */
export function albumPages(items: readonly VisitRecord[]): AlbumPage[] {
  const visits = [...items]
    .reverse()
    .map((visit): AlbumPage => ({ kind: "visit", visit }));
  return [...visits, { kind: "summary" }];
}

export function calendarDay(dateTime: string): CalendarDay {
  const [, month, day] = dateTime.slice(0, 10).split("-").map(Number);
  return { month, day };
}

/** "2026.12.3 – 12.8". 해가 바뀌면 끝 날짜에도 연도를 붙인다. */
export function tripPeriod({ startDate, endDate }: TripRange): string {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const end = `${endMonth}.${endDay}`;
  const endText = startYear === endYear ? end : `${endYear}.${end}`;
  return `${startYear}.${startMonth}.${startDay} – ${endText}`;
}

/** 시작일과 종료일을 모두 센다. */
export function tripDays({ startDate, endDate }: TripRange): number {
  return Math.round((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS) + 1;
}
