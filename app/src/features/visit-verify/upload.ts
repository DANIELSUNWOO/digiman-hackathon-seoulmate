// UPLOAD-01: 앱이 Storage `images` 버킷에 직접 올린다.
import { randomUUID } from "expo-crypto";
import { ApiError } from "../../api";
import { supabase } from "../../supabase";
import { withTimeout } from "./timeout";

const TIMEOUT_MS = 30_000;

async function put(uri: string): Promise<string> {
  if (!supabase) throw new ApiError("CONFIG_MISSING", "Auth is not configured");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new ApiError("SESSION_EXPIRED", "Sign in again");
  // 자기 userId 폴더에만 올릴 수 있다. 이름은 추측할 수 없게 무작위로 한다.
  const path = `visit/${data.session.user.id}/${randomUUID()}.jpg`;
  const bytes = await (await fetch(uri)).arrayBuffer();
  const bucket = supabase.storage.from("images");
  const { error } = await bucket.upload(path, bytes, {
    contentType: "image/jpeg",
  });
  if (error) throw error;
  return bucket.getPublicUrl(path).data.publicUrl;
}

/** 올린 사진의 공개 URL을 돌려준다. */
export function uploadVisitPhoto(uri: string): Promise<string> {
  const timedOut = new ApiError("TIMEOUT", "Upload timed out");
  return withTimeout(put(uri), TIMEOUT_MS, timedOut);
}
