import { ApiError, apiRequest } from "../../api";
import { parsePreference, type Preference } from "./model";
export type PreferenceApiOptions = {
  token: string;
  signal?: AbortSignal;
  request?: typeof apiRequest;
};
function requireToken(options: PreferenceApiOptions) {
  if (!options.token.trim()) throw new Error("Token required");
}
export async function getPreference(
  options: PreferenceApiOptions,
): Promise<Preference | null> {
  requireToken(options);
  try {
    return parsePreference(
      await (options.request ?? apiRequest)<unknown>(
        "/users/me/match-preferences",
        { signal: options.signal },
        options.token,
      ),
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.serverError?.code === "PREFERENCES_NOT_FOUND"
    )
      return null;
    throw error;
  }
}
export async function putPreference(
  input: Preference,
  options: PreferenceApiOptions,
): Promise<Preference> {
  requireToken(options);
  const safe = parsePreference(input);
  return parsePreference(
    await (options.request ?? apiRequest)<unknown>(
      "/users/me/match-preferences",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safe),
        signal: options.signal,
      },
      options.token,
    ),
  );
}
