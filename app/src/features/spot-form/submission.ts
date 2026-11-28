import { ApiError } from "../../api";
import { UploadError } from "../photo-upload";
import type { SpotFormApi } from "./api";
import type { SpotInput, SpotRequest, SubmitSpot } from "./types";

/** 서버가 저장했는지 알 수 없는 실패 */
function isUnknownOutcome(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.code === "HTTP") return (error.status ?? 0) >= 500;
  return ["NETWORK", "TIMEOUT", "INVALID_RESPONSE"].includes(error.code);
}

function toRequest(
  { location, reason, review }: SpotInput,
  photoUrls: string[],
): SpotRequest {
  return {
    ...location,
    name: location.name.trim(),
    photoUrls,
    reason: reason.trim(),
    review: review.trim(),
  };
}

/** 이미 올린 사진은 다시 시도할 때 또 올리지 않는다. */
function createUploader(api: SpotFormApi): (uri: string) => Promise<string> {
  const uploaded = new Map<string, string>();
  return async (uri) => {
    const known = uploaded.get(uri);
    if (known) return known;
    try {
      const url = await api.uploadPhoto(uri);
      uploaded.set(uri, url);
      return url;
    } catch (error: unknown) {
      // 네트워크·세션 문제는 그 안내를 그대로 쓴다.
      throw error instanceof ApiError ? error : new UploadError(error);
    }
  };
}

/** 사진을 올린 뒤 스팟을 저장한다. 화면을 벗어날 때까지 같은 함수를 써야 한다. */
export function createSpotSubmit(api: SpotFormApi, mapId: number): SubmitSpot {
  const upload = createUploader(api);
  // 저장 결과를 모르는 요청. 같은 장소를 다시 저장하면 두 번 생길 수 있다.
  let unsure: { place: string; photoUrl: string } | null = null;

  return async (input, onProgress) => {
    const photoUrls: string[] = [];
    const total = input.photos.length;
    for (const [index, { uri }] of input.photos.entries()) {
      onProgress({ stage: "uploading", index: index + 1, total });
      photoUrls.push(await upload(uri));
    }
    onProgress({ stage: "saving" });
    const place = `${input.location.lat},${input.location.lng}`;
    if (unsure?.place === place) {
      const saved = await api.getPhotoUrls(mapId);
      if (saved.includes(unsure.photoUrl)) return;
    }
    unsure = null;
    try {
      await api.createSpot(mapId, toRequest(input, photoUrls));
    } catch (error: unknown) {
      if (isUnknownOutcome(error)) unsure = { place, photoUrl: photoUrls[0] };
      throw error;
    }
  };
}
