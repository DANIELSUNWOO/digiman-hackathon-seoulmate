import { ApiError } from "../../api";
import { UploadError, type PickedPhoto } from "../photo-upload";
import type { SpotFormApi } from "./api";
import type { SaveProgress } from "./types";

/** 고른 순서대로 사진 URL을 돌려준다. */
export type UploadPhotos = (
  photos: PickedPhoto[],
  onProgress: (progress: SaveProgress) => void,
) => Promise<string[]>;

/**
 * 이미 올린 사진은 다시 시도할 때 또 올리지 않는다.
 * saved는 서버에 저장돼 있어 그대로 쓰는 URL이다.
 */
export function createUploader(
  api: SpotFormApi,
  saved: string[] = [],
): UploadPhotos {
  const uploaded = new Map(saved.map((url) => [url, url]));

  const upload = async (uri: string): Promise<string> => {
    try {
      const url = await api.uploadPhoto(uri);
      uploaded.set(uri, url);
      return url;
    } catch (error: unknown) {
      // 네트워크·세션 문제는 그 안내를 그대로 쓴다.
      throw error instanceof ApiError ? error : new UploadError(error);
    }
  };

  return async (photos, onProgress) => {
    const total = photos.filter(({ uri }) => !saved.includes(uri)).length;
    let index = 0;
    const urls: string[] = [];
    for (const { uri } of photos) {
      if (!saved.includes(uri)) {
        index += 1;
        onProgress({ stage: "uploading", index, total });
      }
      urls.push(uploaded.get(uri) ?? (await upload(uri)));
    }
    return urls;
  };
}
