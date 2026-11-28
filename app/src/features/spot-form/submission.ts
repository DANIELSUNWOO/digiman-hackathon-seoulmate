import { ApiError } from "../../api";
import type { SpotFormApi } from "./api";
import type { SpotInput, SpotRequest, SubmitSpot } from "./types";
import { createUploader } from "./uploader";

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

/** 사진을 올린 뒤 스팟을 저장한다. 화면을 벗어날 때까지 같은 함수를 써야 한다. */
export function createSpotSubmit(api: SpotFormApi, mapId: number): SubmitSpot {
  const upload = createUploader(api);
  // 저장 결과를 모르는 요청. 같은 장소를 다시 저장하면 두 번 생길 수 있다.
  let unsure: { place: string; photoUrl: string } | null = null;

  return async (input, onProgress) => {
    const photoUrls = await upload(input.photos, onProgress);
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
