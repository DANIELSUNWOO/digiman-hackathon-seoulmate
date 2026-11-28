export type TripDates = { startDate: string; endDate: string };
export type Trip = TripDates & { tripId: number };

export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return (
    day <=
    [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  );
}

export function seoulToday(now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid clock");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  const result = `${get("year")?.padStart(4, "0")}-${get("month")}-${get("day")}`;
  if (!isDate(result)) throw new Error("Unsupported clock date");
  return result;
}

export function parseTrip(value: unknown): Trip {
  if (!value || typeof value !== "object")
    throw new Error("Invalid trip response");
  const item = value as Record<string, unknown>;
  if (
    !Number.isSafeInteger(item.tripId) ||
    (item.tripId as number) <= 0 ||
    !isDate(item.startDate) ||
    !isDate(item.endDate) ||
    item.endDate < item.startDate
  )
    throw new Error("Invalid trip response");
  return {
    tripId: item.tripId as number,
    startDate: item.startDate,
    endDate: item.endDate,
  };
}

export function validateDates(
  dates: TripDates,
  today: string,
  original: Trip | null,
): boolean {
  if (!isDate(today) || !isDate(dates.startDate) || !isDate(dates.endDate))
    return false;
  // Server checks end date and range only; T-07 additionally disallows newly selected past starts.
  return (
    dates.endDate >= dates.startDate &&
    dates.endDate >= today &&
    (dates.startDate >= today ||
      (original !== null && dates.startDate === original.startDate))
  );
}

export function sameTrip(a: Trip | null, b: Trip | null): boolean {
  return a === null
    ? b === null
    : b !== null &&
        a.tripId === b.tripId &&
        a.startDate === b.startDate &&
        a.endDate === b.endDate;
}
