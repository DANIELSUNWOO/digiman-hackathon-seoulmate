import { ApiError } from "../../api";
import {
  createTrip,
  getCurrentTrip,
  patchTrip,
  type TripApiOptions,
} from "./api";
import {
  parseTrip,
  sameTrip,
  validateDates,
  type Trip,
  type TripDates,
} from "./model";

export type TripSaveResult =
  | { kind: "saved"; trip: Trip; recovered: boolean }
  | { kind: "conflict"; current: Trip | null }
  | { kind: "unconfirmed"; error?: unknown; current?: Trip | null }
  | { kind: "invalid" }
  | { kind: "stale" }
  | { kind: "cancelled" }
  | { kind: "busy" };

export function createTripSaveFlow(
  options: TripApiOptions & { isCurrentAccount: () => boolean },
) {
  options = {
    token: options.token,
    signal: options.signal,
    request: options.request,
    isCurrentAccount: options.isCurrentAccount,
  };
  if (!options.token.trim()) throw new Error("Token required");
  let busy = false;
  const stopped = (): TripSaveResult | null =>
    !options.isCurrentAccount()
      ? { kind: "stale" }
      : options.signal?.aborted
        ? { kind: "cancelled" }
        : null;
  return {
    async load(): Promise<Trip | null> {
      if (stopped()) throw new Error("Account changed or request cancelled");
      const trip = await getCurrentTrip(options);
      if (stopped()) throw new Error("Account changed or request cancelled");
      return trip;
    },
    async save(
      originalInput: Trip | null,
      desiredInput: TripDates,
      today: string,
    ): Promise<TripSaveResult> {
      if (busy) return { kind: "busy" };
      busy = true;
      try {
        const original =
          originalInput === null ? null : parseTrip(originalInput);
        const desired = {
          startDate: desiredInput.startDate,
          endDate: desiredInput.endDate,
        };
        if (!validateDates(desired, today, original))
          return { kind: "invalid" };
        let stop = stopped();
        if (stop) return stop;
        const current = await getCurrentTrip(options);
        stop = stopped();
        if (stop) return stop;
        if (!sameTrip(current, original)) return { kind: "conflict", current };
        if (
          original &&
          original.startDate === desired.startDate &&
          original.endDate === desired.endDate
        )
          return { kind: "saved", trip: original, recovered: false };
        let recovered = false;
        let existsConflict = false;
        let response: Trip | undefined;
        try {
          response = original
            ? await patchTrip(original, desired, today, options)
            : await createTrip(desired, today, options);
        } catch (error) {
          stop = stopped();
          if (stop) return stop;
          const uncertain =
            error instanceof ApiError &&
            (error.code === "NETWORK" || error.code === "TIMEOUT");
          const exists =
            !original &&
            error instanceof ApiError &&
            error.status === 409 &&
            error.serverError?.code === "TRIP_EXISTS";
          if (!uncertain && !exists) throw error;
          recovered = true;
          existsConflict = exists;
        }
        stop = stopped();
        if (stop) return stop;
        let confirmed: Trip | null;
        try {
          confirmed = await getCurrentTrip(options);
        } catch (error) {
          return stopped() ?? { kind: "unconfirmed", error };
        }
        stop = stopped();
        if (stop) return stop;
        const expectedId = original?.tripId ?? response?.tripId;
        if (
          confirmed &&
          confirmed.startDate === desired.startDate &&
          confirmed.endDate === desired.endDate &&
          ((expectedId !== undefined && confirmed.tripId === expectedId) ||
            existsConflict)
        )
          return { kind: "saved", trip: confirmed, recovered };
        return existsConflict
          ? { kind: "conflict", current: confirmed }
          : { kind: "unconfirmed", current: confirmed };
      } catch (error) {
        return stopped() ?? Promise.reject(error);
      } finally {
        busy = false;
      }
    },
  };
}
