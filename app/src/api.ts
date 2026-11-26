import { supabase } from "./supabase";

export type ApiErrorCode =
  "CONFIG_MISSING" | "SESSION_EXPIRED" | "NETWORK" | "HTTP";
export type ServerError = {
  status?: number;
  code?: string;
  message?: string;
  fieldErrors?: unknown;
};
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status?: number,
    public serverError?: ServerError,
    public rawBody?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!base)
    throw new ApiError("CONFIG_MISSING", "API base URL is not configured");
  if (!supabase) throw new ApiError("CONFIG_MISSING", "Auth is not configured");
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (error.status === 400 || error.status === 401)
      throw new ApiError("SESSION_EXPIRED", error.message, error.status);
    throw new ApiError("NETWORK", error.message, error.status);
  }
  if (
    !data.session ||
    (data.session.expires_at && data.session.expires_at * 1000 <= Date.now())
  )
    throw new ApiError("SESSION_EXPIRED", "Sign in again");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  let response: Response;
  try {
    response = await fetch(
      `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
      { ...init, headers },
    );
  } catch {
    throw new ApiError("NETWORK", "Network request failed");
  }
  if (!response.ok) {
    const rawBody = await response.text();
    let serverError: ServerError | undefined;
    try {
      serverError = JSON.parse(rawBody) as ServerError;
    } catch {
      /* Preserve non-JSON responses as raw text. */
    }
    throw new ApiError(
      response.status === 401 ? "SESSION_EXPIRED" : "HTTP",
      "API request failed",
      response.status,
      serverError,
      rawBody,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
