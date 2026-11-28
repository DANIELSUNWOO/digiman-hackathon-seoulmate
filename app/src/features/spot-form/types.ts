import type { PickedPhoto } from "../photo-upload";
import type { SpotLocation } from "../spot-location";

/** SPOT-01 요청 본문. tagId는 M-13에 입력이 없어 보내지 않는다. */
export interface SpotRequest extends SpotLocation {
  photoUrls: string[];
  reason: string;
  review: string;
}

export interface SpotCreated {
  spotId: number;
  spotCount: number;
  isPublic: boolean;
}

/** 저장하기 전의 입력값 */
export interface SpotInput {
  location: SpotLocation;
  photos: PickedPhoto[];
  reason: string;
  review: string;
}

export type SaveProgress =
  { stage: "uploading"; index: number; total: number } | { stage: "saving" };

export type SubmitSpot = (
  input: SpotInput,
  onProgress: (progress: SaveProgress) => void,
) => Promise<void>;
