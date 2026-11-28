import { ApiError, apiRequest } from "../../api";
import { parseTrip, validateDates, type Trip, type TripDates } from "./model";

export type TripRequest = typeof apiRequest;
export type TripApiOptions = {
  token: string;
  signal?: AbortSignal;
  request?: TripRequest;
};

function requireToken(options: TripApiOptions): void {
  if (!options.token.trim()) throw new Error("Token required");
}

export async function getCurrentTrip(
  options: TripApiOptions,
): Promise<Trip | null> {
  requireToken(options);
  try {
    return parseTrip(
      await (options.request ?? apiRequest)<unknown>(
        "/trips/current",
        { signal: options.signal },
        options.token,
      ),
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.serverError?.code === "TRIP_NOT_FOUND"
    )
      return null;
    throw error;
  }
}

export async function createTrip(
  dates: TripDates,
  today: string,
  options: TripApiOptions,
): Promise<Trip> {
  requireToken(options);
  if (!validateDates(dates, today, null)) throw new Error("Invalid trip dates");
  return parseTrip(
    await (options.request ?? apiRequest)<unknown>(
      "/trips",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: dates.startDate,
          endDate: dates.endDate,
        }),
        signal: options.signal,
      },
      options.token,
    ),
  );
}

export async function patchTrip(
  original: Trip,
  dates: TripDates,
  today: string,
  options: TripApiOptions,
): Promise<Trip> {
  requireToken(options);
  const safe = parseTrip(original);
  if (!validateDates(dates, today, safe)) throw new Error("Invalid trip dates");
  const patch: Partial<TripDates> = {};
  if (dates.startDate !== safe.startDate) patch.startDate = dates.startDate;
  if (dates.endDate !== safe.endDate) patch.endDate = dates.endDate;
  if (!Object.keys(patch).length) return safe;
  return parseTrip(
    await (options.request ?? apiRequest)<unknown>(
      `/trips/${safe.tripId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        signal: options.signal,
      },
      options.token,
    ),
  );
}
