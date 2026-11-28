import { apiRequest } from "../../api";
import { uploadPhoto } from "../photo-upload";
import type { SpotChanges, SpotCreated, SpotRequest } from "./types";

export interface SpotFormApi {
  /** UPLOAD-01. 공개 URL을 돌려준다. */
  uploadPhoto: (uri: string) => Promise<string>;
  /** SPOT-01 */
  createSpot: (mapId: number, request: SpotRequest) => Promise<SpotCreated>;
  /** 이 지도에 저장된 모든 사진 URL. 저장 응답을 못 받았을 때 확인한다. */
  getPhotoUrls: (mapId: number) => Promise<string[]>;
  /** SPOT-02 */
  updateSpot: (spotId: number, changes: SpotChanges) => Promise<unknown>;
  /** SPOT-03 */
  deleteSpot: (spotId: number) => Promise<void>;
}

export const spotFormApi: SpotFormApi = {
  uploadPhoto: (uri) => uploadPhoto("spot", uri),
  createSpot: (mapId, request) =>
    apiRequest<SpotCreated>(`maps/${mapId}/spots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }),
  getPhotoUrls: async (mapId) => {
    const { spots } = await apiRequest<{ spots: { photos: string[] }[] }>(
      `maps/${mapId}`,
    );
    return spots.flatMap((spot) => spot.photos);
  },
  updateSpot: (spotId, changes) =>
    apiRequest(`spots/${spotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    }),
  deleteSpot: (spotId) =>
    apiRequest<void>(`spots/${spotId}`, { method: "DELETE" }),
};
