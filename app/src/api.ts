import { supabase } from "./supabase";

export type ApiErrorCode =
  | "CONFIG_MISSING"
  | "SESSION_EXPIRED"
  | "NETWORK"
  | "HTTP"
  | "ABORTED"
  | "TIMEOUT"
  | "INVALID_RESPONSE";
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
  token?: string,
): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!base)
    throw new ApiError("CONFIG_MISSING", "API base URL is not configured");
  if (/^\/?api\/v1(?:\/|$)/i.test(path))
    throw new ApiError("INVALID_RESPONSE", "Duplicate API prefix");
  if (!token) {
    if (!supabase)
      throw new ApiError("CONFIG_MISSING", "Auth is not configured");
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
    token = data.session.access_token;
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const controller = new AbortController();
  let stopped: ApiError | undefined;
  let rejectStop!: (error: ApiError) => void;
  const stopPromise = new Promise<never>((_, reject) => {
    rejectStop = reject;
  });
  const stop = (code: "ABORTED" | "TIMEOUT") => {
    if (stopped) return;
    stopped = new ApiError(
      code,
      code === "TIMEOUT" ? "Request timed out" : "Request aborted",
    );
    controller.abort();
    rejectStop(stopped);
  };
  const abort = () => stop("ABORTED");
  const deadline = Date.now() + 15000;
  const timeout = setTimeout(() => stop("TIMEOUT"), 15000);
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await Promise.race([
      fetch(`${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
        ...init,
        headers,
        signal: controller.signal,
      }),
      stopPromise,
    ]);
    if (!response.ok) {
      const rawBody = await Promise.race([response.text(), stopPromise]);
      let serverError: ServerError | undefined;
      try {
        serverError = JSON.parse(rawBody) as ServerError;
      } catch {
        /* Preserve non-JSON responses as raw text. */
      }
      if (Date.now() >= deadline) {
        stop("TIMEOUT");
        throw stopped;
      }
      throw new ApiError(
        response.status === 401 ? "SESSION_EXPIRED" : "HTTP",
        "API request failed",
        response.status,
        serverError,
        rawBody,
      );
    }
    if (response.status === 204) {
      if (Date.now() >= deadline) {
        stop("TIMEOUT");
        throw stopped;
      }
      return undefined as T;
    }
    const raw = await Promise.race([response.text(), stopPromise]);
    try {
      const parsed = JSON.parse(raw) as T;
      if (Date.now() >= deadline) {
        stop("TIMEOUT");
        throw stopped;
      }
      return parsed;
    } catch {
      throw new ApiError(
        "INVALID_RESPONSE",
        "Invalid JSON response",
        response.status,
      );
    }
  } catch (error) {
    if (stopped) throw stopped;
    if (error instanceof ApiError) throw error;
    throw new ApiError("NETWORK", "Network request failed");
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
  }
}
