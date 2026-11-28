import { ApiError, apiRequest } from "../../api";
import { validateMe, type Me } from "../../users";
import { getPreference, putPreference, type PreferenceApiOptions } from "./api";
import { parsePreference, samePreference, type Preference } from "./model";
export type PreferenceSaveResult =
  | { kind: "saved"; preference: Preference; me: Me; recovered: boolean }
  | { kind: "conflict"; current: Preference | null }
  | { kind: "unconfirmed"; error?: unknown; current?: Preference | null }
  | { kind: "invalid" | "stale" | "cancelled" | "busy" };
export function createPreferenceSaveFlow(
  options: PreferenceApiOptions & { userId: string; isCurrent: () => boolean },
) {
  const { token, signal, request, userId, isCurrent } = options;
  if (!token.trim() || !userId) throw new Error("Token and user required");
  const api = { token, signal, request };
  let busy = false;
  const stopped = (): PreferenceSaveResult | null =>
    !isCurrent()
      ? { kind: "stale" }
      : signal?.aborted
        ? { kind: "cancelled" }
        : null;
  async function member(): Promise<Me> {
    const raw = await (request ?? apiRequest)<unknown>(
      "/users/me",
      { signal },
      token,
    );
    return validateMe(raw, userId);
  }
  return {
    async load(): Promise<Preference | null> {
      if (stopped()) throw new Error("Request no longer current");
      const result = await getPreference(api);
      if (stopped()) throw new Error("Request no longer current");
      return result;
    },
    async save(
      originalInput: Preference | null,
      desiredInput: Preference,
    ): Promise<PreferenceSaveResult> {
      if (busy) return { kind: "busy" };
      busy = true;
      try {
        let original: Preference | null, desired: Preference;
        try {
          original =
            originalInput === null ? null : parsePreference(originalInput);
          desired = parsePreference(desiredInput);
        } catch {
          return { kind: "invalid" };
        }
        let stop = stopped();
        if (stop) return stop;
        const current = await getPreference(api);
        stop = stopped();
        if (stop) return stop;
        if (!samePreference(current, original))
          return { kind: "conflict", current };
        let recovered = false;
        if (!samePreference(current, desired)) {
          try {
            const result = await putPreference(desired, api);
            if (!samePreference(result, desired)) recovered = true;
          } catch (error) {
            stop = stopped();
            if (stop) return stop;
            if (
              error instanceof ApiError &&
              (error.code === "NETWORK" || error.code === "TIMEOUT")
            )
              recovered = true;
            else throw error;
          }
        }
        stop = stopped();
        if (stop) return stop;
        try {
          const confirmed = await getPreference(api);
          stop = stopped();
          if (stop) return stop;
          if (!samePreference(confirmed, desired))
            return { kind: "unconfirmed", current: confirmed };
          const me = await member();
          stop = stopped();
          if (stop) return stop;
          if (me.role !== "TRAVELER" || !me.onboarding.preferences)
            return { kind: "unconfirmed", current: confirmed };
          return { kind: "saved", preference: desired, me, recovered };
        } catch (error) {
          return stopped() ?? { kind: "unconfirmed", error };
        }
      } catch (error) {
        return stopped() ?? Promise.reject(error);
      } finally {
        busy = false;
      }
    },
  };
}
