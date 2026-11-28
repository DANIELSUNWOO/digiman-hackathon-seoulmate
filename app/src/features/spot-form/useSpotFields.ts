import { useState } from "react";
import type { PickedPhoto } from "../photo-upload";

/** SPOT-01의 상한 */
export const PHOTO_MAX = 3;
export const TEXT_MAX = 500;

export interface SpotFields {
  photos: PickedPhoto[];
  reason: string;
  review: string;
  setReason: (reason: string) => void;
  setReview: (review: string) => void;
  addPhoto: (photo: PickedPhoto) => void;
  removePhoto: (uri: string) => void;
}

export type SpotValues = Pick<SpotFields, "photos" | "reason" | "review">;

const EMPTY: SpotValues = { photos: [], reason: "", review: "" };

/** 장소를 다시 고르러 가도 남도록 흐름 쪽에서 보관한다. 수정할 때는 저장된 값으로 시작한다. */
export function useSpotFields(initial: SpotValues = EMPTY): SpotFields {
  const [photos, setPhotos] = useState<PickedPhoto[]>(initial.photos);
  const [reason, setReason] = useState(initial.reason);
  const [review, setReview] = useState(initial.review);

  const addPhoto = (photo: PickedPhoto): void => {
    setPhotos((previous) =>
      previous.length < PHOTO_MAX ? [...previous, photo] : previous,
    );
  };

  const removePhoto = (uri: string): void => {
    setPhotos((previous) => previous.filter((photo) => photo.uri !== uri));
  };

  return {
    photos,
    reason,
    review,
    setReason,
    setReview,
    addPhoto,
    removePhoto,
  };
}
