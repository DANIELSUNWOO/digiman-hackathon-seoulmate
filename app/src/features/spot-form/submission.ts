import { ApiError } from "../../api";
import { UploadError } from "../photo-upload";
import type { SpotFormApi } from "./api";
import { createDuplicateGuard, type Attempt } from "./duplicateGuard";
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

function toAttempt(input: SpotInput): Attempt {
  const uris = input.photos.map(({ uri }) => uri);
  const request = toRequest(input, uris);
  return {
    place: `${request.lat},${request.lng}`,
    content: JSON.stringify(request),
    name: request.name,
  };
}

/** 사진을 올린 뒤 스팟을 저장한다. 화면을 벗어날 때까지 같은 함수를 써야 한다. */
export function createSpotSubmit(api: SpotFormApi, mapId: number): SubmitSpot {
  let upload = createUploader(api);
  const guard = createDuplicateGuard(api, mapId, () => {
    upload = createUploader(api);
  });

  return async (input, onProgress) => {
    const attempt = toAttempt(input);
    if (await guard.isSaved(attempt)) return;
    const photoUrls: string[] = [];
    const total = input.photos.length;
    for (const [index, { uri }] of input.photos.entries()) {
      onProgress({ stage: "uploading", index: index + 1, total });
      photoUrls.push(await upload(uri));
    }
    onProgress({ stage: "saving" });
    try {
      await api.createSpot(mapId, toRequest(input, photoUrls));
    } catch (error: unknown) {
      if (isUnknownOutcome(error))
        guard.remember({ ...attempt, photoUrl: photoUrls[0] });
      throw error;
    }
  };
}
