// UPLOAD-01: 앱이 Storage `images` 버킷에 직접 올린다.
import { randomUUID } from "expo-crypto";
import { ApiError } from "../../api";
import { supabase } from "../../supabase";
import { withTimeout } from "./timeout";

const TIMEOUT_MS = 30_000;

/** UPLOAD-01의 폴더. 이 앱 B가 쓰는 것만 둔다. */
export type PhotoPurpose = "spot" | "visit";

/** 사진을 올리지 못한 실패. 저장·인증 API의 실패와 안내를 나눈다. */
export class UploadError extends Error {
  constructor(public cause: unknown) {
    super("photo upload failed");
    this.name = "UploadError";
  }
}

async function put(purpose: PhotoPurpose, uri: string): Promise<string> {
  if (!supabase) throw new ApiError("CONFIG_MISSING", "Auth is not configured");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new ApiError("SESSION_EXPIRED", "Sign in again");
  // 자기 userId 폴더에만 올릴 수 있다. 이름은 추측할 수 없게 무작위로 한다.
  const path = `${purpose}/${data.session.user.id}/${randomUUID()}.jpg`;
  const bytes = await (await fetch(uri)).arrayBuffer();
  const bucket = supabase.storage.from("images");
  const { error } = await bucket.upload(path, bytes, {
    contentType: "image/jpeg",
  });
  if (error) throw error;
  return bucket.getPublicUrl(path).data.publicUrl;
}

/** 올린 사진의 공개 URL을 돌려준다. */
export function uploadPhoto(
  purpose: PhotoPurpose,
  uri: string,
): Promise<string> {
  const timedOut = new ApiError("TIMEOUT", "Upload timed out");
  return withTimeout(put(purpose, uri), TIMEOUT_MS, timedOut);
}
