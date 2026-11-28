import { ApiError } from "../../api";
import type { MapSpot } from "../mate-home";
import type { SpotFormApi } from "./api";
import type { SpotChanges, SpotInput, SubmitSpot } from "./types";
import { createUploader } from "./uploader";

function allValues(
  { location, reason, review }: SpotInput,
  photoUrls: string[],
): Required<SpotChanges> {
  return {
    name: location.name.trim(),
    photoUrls,
    reason: reason.trim(),
    review: review.trim(),
  };
}

/** 바뀐 값만 고른다. 글을 보내면 서버가 번역을 다시 한다. */
function changedValues(
  spot: MapSpot,
  next: Required<SpotChanges>,
): SpotChanges {
  const samePhotos =
    spot.photos.length === next.photoUrls.length &&
    spot.photos.every((url, index) => url === next.photoUrls[index]);
  return {
    ...(next.name !== spot.name && { name: next.name }),
    ...(!samePhotos && { photoUrls: next.photoUrls }),
    ...(next.reason !== (spot.reason?.original ?? "") && {
      reason: next.reason,
    }),
    ...(next.review !== (spot.review?.original ?? "") && {
      review: next.review,
    }),
  };
}

/** 새 사진을 올린 뒤 스팟을 고친다. 화면을 벗어날 때까지 같은 함수를 써야 한다. */
export function createSpotEdit(api: SpotFormApi, spot: MapSpot): SubmitSpot {
  const upload = createUploader(api, spot.photos);
  // 한 번 보낸 뒤에는 서버 값이 처음과 같다고 볼 수 없어 전부 보낸다.
  let sent = false;

  return async (input, onProgress) => {
    const next = allValues(input, await upload(input.photos, onProgress));
    const changes = sent ? next : changedValues(spot, next);
    if (Object.keys(changes).length === 0) return;
    onProgress({ stage: "saving" });
    sent = true;
    await api.updateSpot(spot.spotId, changes);
  };
}

/** 이미 지워진 스팟이면 성공으로 본다. 응답을 못 받고 다시 누른 경우다. */
export async function removeSpot(
  api: SpotFormApi,
  spotId: number,
): Promise<void> {
  try {
    await api.deleteSpot(spotId);
  } catch (error: unknown) {
    const gone =
      error instanceof ApiError && error.serverError?.code === "SPOT_NOT_FOUND";
    if (!gone) throw error;
  }
}
