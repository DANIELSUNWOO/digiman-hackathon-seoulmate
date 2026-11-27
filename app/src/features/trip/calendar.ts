import { isDate, type TripDates } from "./model";

export type Selection = {
  startDate: string;
  endDate: string;
  selecting: "start" | "end";
};
export function monthShift(month: string, offset: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + m - 1 + offset;
  const year = Math.floor(index / 12),
    next = (index % 12) + 1;
  return `${String(year).padStart(4, "0")}-${String(next).padStart(2, "0")}`;
}
export function monthDays(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, 1);
  date.setUTCHours(0, 0, 0, 0);
  const lead = (date.getUTCDay() + 6) % 7;
  const result: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= 31; d++) {
    const value = `${month}-${String(d).padStart(2, "0")}`;
    if (isDate(value)) result.push(value);
  }
  while (result.length % 7) result.push(null);
  return result;
}
export function selectDay(
  state: Selection,
  day: string,
  today: string,
): Selection {
  if (!isDate(day) || day < today) return state;
  if (state.selecting === "end" && state.startDate && day >= state.startDate)
    return { ...state, endDate: day, selecting: "start" };
  return { startDate: day, endDate: "", selecting: "end" };
}
export function datesOf(s: Selection): TripDates {
  return { startDate: s.startDate, endDate: s.endDate };
}
export function nightsBetween(start: string, end: string): number | null {
  if (!isDate(start) || !isDate(end) || end < start) return null;
  const time = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(0);
    date.setUTCFullYear(y, m - 1, d);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
  };
  return (time(end) - time(start)) / 86400000;
}
