import { apiRequest } from "../../api";
import type { CourseSpot, VisitCreated, VisitRequest } from "./types";
import { uploadVisitPhoto } from "./upload";

export interface VisitVerifyApi {
  /** MATCH-06에서 스팟 하나를 찾는다. 코스에 없으면 null */
  getSpot: (matchId: number, spotId: number) => Promise<CourseSpot | null>;
  /** UPLOAD-01. 공개 URL을 돌려준다. */
  uploadPhoto: (uri: string) => Promise<string>;
  /** VISIT-01 */
  verify: (matchId: number, request: VisitRequest) => Promise<VisitCreated>;
}

export const visitVerifyApi: VisitVerifyApi = {
  getSpot: async (matchId, spotId) => {
    const { spots } = await apiRequest<{ spots: CourseSpot[] }>(
      `matches/${matchId}/course`,
    );
    return spots.find((spot) => spot.spotId === spotId) ?? null;
  },
  uploadPhoto: uploadVisitPhoto,
  verify: (matchId, request) =>
    apiRequest<VisitCreated>(`matches/${matchId}/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }),
};
