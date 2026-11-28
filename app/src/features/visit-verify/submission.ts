import { ApiError } from "../../api";
import { UploadError } from "../photo-upload";
import type { VisitVerifyApi } from "./api";
import type { SubmitVisit } from "./types";

/** 업로드한 뒤 인증한다. 인증만 실패하면 다시 시도할 때 사진을 또 올리지 않는다. */
export function createSubmit(
  api: VisitVerifyApi,
  matchId: number,
  spotId: number,
): SubmitVisit {
  let uploaded: { uri: string; url: string } | null = null;

  const upload = async (uri: string): Promise<string> => {
    try {
      return await api.uploadPhoto(uri);
    } catch (error: unknown) {
      // 네트워크·세션 문제는 그 안내를 그대로 쓴다.
      throw error instanceof ApiError ? error : new UploadError(error);
    }
  };

  return async ({ photo, review }, { lat, lng }, onStage) => {
    if (uploaded?.uri !== photo.uri) {
      onStage("uploading");
      uploaded = { uri: photo.uri, url: await upload(photo.uri) };
    }
    onStage("verifying");
    const request = { spotId, photoUrl: uploaded.url, review, lat, lng };
    return api.verify(matchId, request);
  };
}
