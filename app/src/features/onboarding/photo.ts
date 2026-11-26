import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { ApiError } from "../../api";
import { supabase } from "../../supabase";
import type { LocalProfilePhoto } from "./draftStore";
import {
  buildProfilePhotoPath,
  MAX_IMAGE_BYTES,
  PROFILE_IMAGE_URL_MAX,
  validateImageFile,
} from "./validation";

export const UPLOAD_TIMEOUT_MS = 15000;

function makeUniqueKey(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}_${rand}`;
}

export async function pickImageAsset(
  source: "library" | "camera",
  options?: { square?: boolean },
): Promise<LocalProfilePhoto | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      throw { code: "PERMISSION_DENIED" };
    }
  } else if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      throw { code: "PERMISSION_DENIED" };
    }
  }

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: options?.square ?? false,
    ...(options?.square ? { aspect: [1, 1] as [number, number] } : {}),
    quality: 0.85,
  };

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  let bytes: ArrayBuffer;
  let actualMime: string | null | undefined =
    asset.mimeType ?? asset.file?.type ?? null;
  try {
    if (asset.file) {
      bytes = await asset.file.arrayBuffer();
      if (!actualMime && asset.file.type) actualMime = asset.file.type;
    } else {
      const response = await fetch(asset.uri);
      bytes = await response.arrayBuffer();
      if (!actualMime) actualMime = response.headers.get("content-type");
    }
  } catch {
    throw { code: "IMAGE_READ_FAILED" };
  }

  const size = bytes.byteLength;
  const check = validateImageFile({
    size,
    mimeType: actualMime,
    fileName: asset.fileName ?? asset.file?.name ?? asset.uri,
    maxBytes: MAX_IMAGE_BYTES,
  });
  if (check.error || !check.mimeType) {
    throw { code: check.error ?? "UNSUPPORTED_IMAGE" };
  }

  return {
    uri: asset.uri,
    mimeType: check.mimeType,
    size,
    bytes,
    localKey: `${makeUniqueKey()}_${size}`,
  };
}

export async function writeNativeDemoPassportTempFile(
  bytes: Uint8Array,
): Promise<{
  uri: string;
  size: number;
  cleanup: () => Promise<void>;
}> {
  const file = new File(
    Paths.cache,
    `seoulmate-demo-passport-${makeUniqueKey()}.png`,
  );
  file.create({ overwrite: true });
  await file.write(bytes);
  const actualSize = file.size;
  if (!file.exists || actualSize <= 0 || actualSize !== bytes.byteLength) {
    try {
      if (file.exists) file.delete();
    } catch {
      /* Ignore cleanup error on failed temp creation. */
    }
    throw { code: "IMAGE_READ_FAILED" };
  }
  return {
    uri: file.uri,
    size: actualSize,
    cleanup: async () => {
      try {
        if (file.exists) file.delete();
      } catch {
        /* Ignore already-deleted temp files. */
      }
    },
  };
}

export type UploadControlError = {
  code: "UPLOAD_ABORTED" | "UPLOAD_TIMEOUT" | "UPLOAD_FAILED";
  abortSent?: boolean;
};

function isDuplicateStorageError(status: number, bodyText: string): boolean {
  if (status === 409) return true;
  if (status === 400) {
    const lower = bodyText.toLowerCase();
    return lower.includes("duplicate") || lower.includes("already exists");
  }
  return false;
}

/**
 * Uploads directly to the Storage object REST endpoint instead of `StorageFileApi.upload`,
 * because installed `@supabase/storage-js` omits `AbortSignal` forwarding on `upload()`.
 */
export async function uploadProfilePhotoWithControl(deps: {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
  userId: string;
  photo: LocalProfilePhoto;
  publicUrlForPath?: (path: string) => string;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
  allowExistingOnUncertainRetry?: boolean;
}): Promise<string> {
  if (!deps.supabaseUrl || !deps.anonKey || !deps.accessToken) {
    throw { code: "UPLOAD_FAILED" } satisfies UploadControlError;
  }

  const path = buildProfilePhotoPath(
    deps.userId,
    deps.photo.mimeType,
    deps.photo.localKey,
  );
  const cleanBase = deps.supabaseUrl.replace(/\/$/, "");
  const uploadUrl = `${cleanBase}/storage/v1/object/images/${path}`;
  const publicUrl = (
    deps.publicUrlForPath?.(path) ??
    `${cleanBase}/storage/v1/object/public/images/${path}`
  ).trim();

  if (!publicUrl || publicUrl.length > PROFILE_IMAGE_URL_MAX) {
    throw { code: "UPLOAD_FAILED" } satisfies UploadControlError;
  }

  const timeoutMs = deps.timeoutMs ?? UPLOAD_TIMEOUT_MS;
  const controller = new AbortController();
  let stopped: UploadControlError | ApiError | undefined;
  let rejectStop!: (error: unknown) => void;
  const stopPromise = new Promise<never>((_, reject) => {
    rejectStop = reject;
  });

  const stop = (code: "UPLOAD_ABORTED" | "UPLOAD_TIMEOUT") => {
    if (stopped) return;
    stopped = { code, abortSent: true };
    controller.abort();
    rejectStop(stopped);
  };

  const onCallerAbort = () => stop("UPLOAD_ABORTED");
  const timer = setTimeout(() => stop("UPLOAD_TIMEOUT"), timeoutMs);
  if (deps.signal?.aborted) onCallerAbort();
  else deps.signal?.addEventListener("abort", onCallerAbort, { once: true });

  const fetcher = deps.fetcher ?? fetch;
  try {
    const response = await Promise.race([
      fetcher(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deps.accessToken}`,
          apikey: deps.anonKey,
          "Content-Type": deps.photo.mimeType,
          "cache-control": "max-age=3600",
          "x-upsert": "false",
        },
        body: deps.photo.bytes,
        signal: controller.signal,
      }),
      stopPromise,
    ]);

    if (stopped) throw stopped;
    if (!response.ok) {
      const bodyText = await Promise.race([
        response.text().catch(() => ""),
        stopPromise,
      ]);
      if (response.status === 401) {
        throw new ApiError("SESSION_EXPIRED", "Sign in again", 401);
      }
      if (
        deps.allowExistingOnUncertainRetry &&
        isDuplicateStorageError(response.status, bodyText)
      ) {
        return publicUrl;
      }
      throw { code: "UPLOAD_FAILED" } satisfies UploadControlError;
    }

    return publicUrl;
  } catch (error) {
    if (stopped) throw stopped;
    if (error instanceof ApiError) throw error;
    if (error && typeof error === "object" && "code" in error) throw error;
    throw { code: "UPLOAD_FAILED" } satisfies UploadControlError;
  } finally {
    clearTimeout(timer);
    deps.signal?.removeEventListener("abort", onCallerAbort);
  }
}

export async function uploadProfilePhoto(input: {
  userId: string;
  accessToken: string;
  photo: LocalProfilePhoto;
  signal?: AbortSignal;
  timeoutMs?: number;
  allowExistingOnUncertainRetry?: boolean;
}): Promise<string> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabase || !supabaseUrl || !anonKey) {
    throw { code: "UPLOAD_FAILED" } satisfies UploadControlError;
  }
  return uploadProfilePhotoWithControl({
    supabaseUrl,
    anonKey,
    accessToken: input.accessToken,
    userId: input.userId,
    photo: input.photo,
    publicUrlForPath: (path) =>
      supabase!.storage.from("images").getPublicUrl(path).data?.publicUrl ?? "",
    signal: input.signal,
    timeoutMs: input.timeoutMs,
    allowExistingOnUncertainRetry: input.allowExistingOnUncertainRetry,
  });
}
