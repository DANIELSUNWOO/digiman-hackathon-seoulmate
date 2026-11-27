import { ApiError, apiRequest } from "../../api";
import { validateMe, type Me, type VerifyStatus } from "../../users";
import type { LocalProfilePhoto, UploadedProfilePhoto } from "./draftStore";
import {
  extensionForMime,
  validateImageFile,
  validateProfileForm,
  type ProfileFieldErrors,
  type ProfileGenderChoice,
  type SupportedImageMime,
} from "./validation";

// Minimal 1x1 transparent PNG bytes for demo identity verification without user camera/gallery input.
export const DEMO_PASSPORT_PNG_BYTES = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120,
  156, 99, 96, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51, 0, 0, 0, 0, 73, 69, 78, 68,
  174, 66, 96, 130,
]);

export type VerificationFileInput =
  | {
      kind: "web-blob";
      name: string;
      type: SupportedImageMime;
      size: number;
      blob: Blob;
    }
  | {
      kind: "native-uri";
      name: string;
      type: SupportedImageMime;
      size: number;
      uri: string;
    };

export function createWebDemoPassportFile(): Extract<
  VerificationFileInput,
  { kind: "web-blob" }
> {
  const bytes = new Uint8Array(DEMO_PASSPORT_PNG_BYTES);
  const blob = new Blob([bytes], { type: "image/png" });
  return {
    kind: "web-blob",
    name: "demo-passport.png",
    type: "image/png",
    size: bytes.byteLength,
    blob,
  };
}

export const createDemoPassportFile = createWebDemoPassportFile;

export async function prepareVerificationFile(deps: {
  platform: string;
  selectedSample: LocalProfilePhoto | null;
  writeNativeTempFile: (bytes: Uint8Array) => Promise<{
    uri: string;
    size: number;
    cleanup: () => Promise<void>;
  }>;
}): Promise<{
  file: VerificationFileInput;
  cleanup: () => Promise<void>;
}> {
  if (deps.platform === "web") {
    if (deps.selectedSample) {
      const ext = extensionForMime(deps.selectedSample.mimeType);
      return {
        file: {
          kind: "web-blob",
          name: `demo-verification.${ext}`,
          type: deps.selectedSample.mimeType,
          size: deps.selectedSample.size,
          blob: new Blob([deps.selectedSample.bytes], {
            type: deps.selectedSample.mimeType,
          }),
        },
        cleanup: async () => {},
      };
    }
    return { file: createWebDemoPassportFile(), cleanup: async () => {} };
  }

  if (deps.selectedSample) {
    const ext = extensionForMime(deps.selectedSample.mimeType);
    return {
      file: {
        kind: "native-uri",
        name: `demo-verification.${ext}`,
        type: deps.selectedSample.mimeType,
        size: deps.selectedSample.size,
        uri: deps.selectedSample.uri,
      },
      cleanup: async () => {},
    };
  }

  const temp = await deps.writeNativeTempFile(
    new Uint8Array(DEMO_PASSPORT_PNG_BYTES),
  );
  return {
    file: {
      kind: "native-uri",
      name: "demo-passport.png",
      type: "image/png",
      size: temp.size,
      uri: temp.uri,
    },
    cleanup: temp.cleanup,
  };
}

export async function submitVerification(
  token: string,
  file: VerificationFileInput,
  signal?: AbortSignal,
): Promise<{ verifyStatus: VerifyStatus }> {
  const checked = validateImageFile({
    size: file.size,
    mimeType: file.type,
    fileName: file.name,
  });
  if (checked.error) {
    throw { code: checked.error };
  }

  const resolvedMime = checked.mimeType ?? file.type;
  const form = new FormData();
  if (file.kind === "native-uri") {
    if (!file.uri || !file.uri.trim()) {
      throw { code: "IMAGE_EMPTY" };
    }
    form.append("passportImage", {
      uri: file.uri,
      name: file.name,
      type: resolvedMime,
    } as unknown as Blob);
  } else if (
    file.kind === "web-blob" ||
    ("blob" in file && (file as { blob?: unknown }).blob !== undefined)
  ) {
    const blob = (file as { blob?: Blob }).blob;
    if (!blob) throw { code: "IMAGE_EMPTY" };
    form.append("passportImage", blob, file.name);
  } else {
    throw { code: "IMAGE_EMPTY" };
  }

  const res = await apiRequest<{ verifyStatus?: unknown }>(
    "/users/me/verification",
    {
      method: "POST",
      body: form,
      signal,
    },
    token,
  );
  if (res?.verifyStatus !== "VERIFIED") {
    throw new ApiError("INVALID_RESPONSE", "Invalid verification response");
  }
  return { verifyStatus: "VERIFIED" };
}

export async function submitProfile(
  token: string,
  payload: {
    nickname: string;
    gender: "MALE" | "FEMALE";
    birthYear: number;
    profileImageUrl?: string;
    bio?: string;
  },
  userId: string,
  signal?: AbortSignal,
): Promise<Me> {
  const res = await apiRequest<unknown>(
    "/users/me/profile",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    },
    token,
  );
  return validateMe(res, userId);
}

function isUncertainFailure(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "NETWORK" || error.code === "TIMEOUT")
  );
}

export type VerificationFlowResult =
  | { kind: "verified" }
  | { kind: "refresh_failed"; error: unknown }
  | { kind: "stale" };

export async function executeVerificationFlow(deps: {
  token: string;
  file?: VerificationFileInput;
  prepareFile?: () => Promise<{
    file: VerificationFileInput;
    cleanup?: () => Promise<void>;
  }>;
  submit?: typeof submitVerification;
  refreshMember: () => Promise<void>;
  getMe: () => Me | null;
  isCurrentAccount: () => boolean;
  signal?: AbortSignal;
}): Promise<VerificationFlowResult> {
  const send = deps.submit ?? submitVerification;
  let cleanup: (() => Promise<void>) | undefined;
  let postError: unknown = null;
  try {
    let targetFile = deps.file;
    if (!targetFile && deps.prepareFile) {
      const prepared = await deps.prepareFile();
      targetFile = prepared.file;
      cleanup = prepared.cleanup;
    }
    if (!targetFile) {
      throw { code: "IMAGE_EMPTY" };
    }
    if (!deps.isCurrentAccount()) return { kind: "stale" };
    if (deps.signal?.aborted) {
      throw new ApiError("ABORTED", "Request aborted");
    }

    try {
      await send(deps.token, targetFile, deps.signal);
    } catch (error) {
      if (!isUncertainFailure(error)) throw error;
      postError = error;
    }

    if (!deps.isCurrentAccount()) return { kind: "stale" };
    if (deps.signal?.aborted) {
      throw new ApiError("ABORTED", "Request aborted");
    }

    try {
      await deps.refreshMember();
    } catch (error) {
      if (!deps.isCurrentAccount()) return { kind: "stale" };
      if (postError) throw postError;
      return { kind: "refresh_failed", error };
    }

    if (!deps.isCurrentAccount()) return { kind: "stale" };
    const me = deps.getMe();
    if (me?.onboarding.verified) return { kind: "verified" };
    if (postError) throw postError;
    return {
      kind: "refresh_failed",
      error: new ApiError("INVALID_RESPONSE", "Verification state not updated"),
    };
  } finally {
    if (cleanup) {
      await cleanup().catch(() => {});
    }
  }
}

export type ProfileSaveFlowResult =
  | { kind: "invalid"; errors: ProfileFieldErrors }
  | { kind: "saved"; recovered: boolean }
  | { kind: "refresh_failed"; error: unknown }
  | { kind: "stale" };

function awaitWithAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject({ code: "UPLOAD_ABORTED" });
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject({ code: "UPLOAD_ABORTED" });
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function isUploadRetryUncertainError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === "UPLOAD_ABORTED" || code === "UPLOAD_TIMEOUT";
}

export async function executeProfileSaveFlow(deps: {
  token: string;
  userId: string;
  apiConfigured: boolean;
  input: {
    nickname: string;
    gender: ProfileGenderChoice;
    birthYear: string;
    bio: string;
    localPhoto: LocalProfilePhoto | null;
    uploadedPhoto: UploadedProfilePhoto | null;
    uncertainUploadLocalKey?: string | null;
  };
  currentYear?: number;
  uploadPhoto: (
    photo: LocalProfilePhoto,
    options?: {
      signal?: AbortSignal;
      allowExistingOnUncertainRetry?: boolean;
    },
  ) => Promise<string>;
  onPhotoUploaded?: (uploaded: UploadedProfilePhoto) => void;
  onUploadUncertain?: (localKey: string) => void;
  onUploadUncertainCleared?: (localKey: string) => void;
  submit?: typeof submitProfile;
  refreshMember: () => Promise<void>;
  getMe: () => Me | null;
  clearDraft: () => void;
  isCurrentAccount: () => boolean;
  signal?: AbortSignal;
}): Promise<ProfileSaveFlowResult> {
  const precheck = validateProfileForm(
    {
      nickname: deps.input.nickname,
      gender: deps.input.gender,
      birthYear: deps.input.birthYear,
      bio: deps.input.bio,
      profileImageUrl:
        deps.input.localPhoto &&
        deps.input.uploadedPhoto?.localKey === deps.input.localPhoto.localKey
          ? deps.input.uploadedPhoto.publicUrl
          : undefined,
    },
    deps.currentYear,
  );
  if (!precheck.ok) {
    return { kind: "invalid", errors: precheck.errors };
  }

  if (!deps.apiConfigured) {
    throw new ApiError("CONFIG_MISSING", "API is not configured");
  }
  if (!deps.isCurrentAccount()) return { kind: "stale" };
  if (deps.signal?.aborted) {
    throw new ApiError("ABORTED", "Request aborted");
  }

  let profileImageUrl = precheck.payload.profileImageUrl;
  const localPhoto = deps.input.localPhoto;
  if (localPhoto && !profileImageUrl) {
    const wasAlreadyUncertain =
      deps.input.uncertainUploadLocalKey === localPhoto.localKey;
    // Record uncertainty before transport starts so unmount + abort preserves retry recovery for the owned draft.
    deps.onUploadUncertain?.(localPhoto.localKey);
    let publicUrl: string;
    try {
      publicUrl = await awaitWithAbort(
        deps.uploadPhoto(localPhoto, {
          signal: deps.signal,
          allowExistingOnUncertainRetry: wasAlreadyUncertain,
        }),
        deps.signal,
      );
    } catch (error) {
      if (!isUploadRetryUncertainError(error)) {
        if (!wasAlreadyUncertain) {
          deps.onUploadUncertainCleared?.(localPhoto.localKey);
        }
      }
      if (!deps.isCurrentAccount()) return { kind: "stale" };
      throw error;
    }
    if (!deps.isCurrentAccount()) return { kind: "stale" };
    if (deps.signal?.aborted) {
      throw { code: "UPLOAD_ABORTED" };
    }
    deps.onPhotoUploaded?.({
      localKey: localPhoto.localKey,
      publicUrl,
    });
    profileImageUrl = publicUrl;
  }

  const finalCheck = validateProfileForm(
    {
      nickname: deps.input.nickname,
      gender: deps.input.gender,
      birthYear: deps.input.birthYear,
      bio: deps.input.bio,
      profileImageUrl,
    },
    deps.currentYear,
  );
  if (!finalCheck.ok) {
    return { kind: "invalid", errors: finalCheck.errors };
  }

  const send = deps.submit ?? submitProfile;
  let saveError: unknown = null;
  try {
    await send(deps.token, finalCheck.payload, deps.userId, deps.signal);
  } catch (error) {
    const alreadyRegistered =
      error instanceof ApiError &&
      error.status === 409 &&
      error.serverError?.code === "PROFILE_ALREADY_REGISTERED";
    if (!alreadyRegistered && !isUncertainFailure(error)) {
      throw error;
    }
    saveError = error;
  }

  if (!deps.isCurrentAccount()) return { kind: "stale" };
  if (deps.signal?.aborted) {
    throw new ApiError("ABORTED", "Request aborted");
  }

  try {
    await deps.refreshMember();
  } catch (error) {
    if (!deps.isCurrentAccount()) return { kind: "stale" };
    if (saveError) throw saveError;
    return { kind: "refresh_failed", error };
  }

  if (!deps.isCurrentAccount()) return { kind: "stale" };
  const me = deps.getMe();
  if (me?.onboarding.profile) {
    deps.clearDraft();
    return { kind: "saved", recovered: saveError !== null };
  }
  if (saveError) throw saveError;
  return {
    kind: "refresh_failed",
    error: new ApiError("INVALID_RESPONSE", "Profile state not updated"),
  };
}
