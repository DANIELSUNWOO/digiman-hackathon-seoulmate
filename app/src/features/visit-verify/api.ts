import { apiRequest } from "../../api";
import type { CourseSpot } from "./types";

export interface VisitVerifyApi {
  /** MATCH-06에서 스팟 하나를 찾는다. 코스에 없으면 null */
  getSpot: (matchId: number, spotId: number) => Promise<CourseSpot | null>;
}

export const visitVerifyApi: VisitVerifyApi = {
  getSpot: async (matchId, spotId) => {
    const { spots } = await apiRequest<{ spots: CourseSpot[] }>(
      `matches/${matchId}/course`,
    );
    return spots.find((spot) => spot.spotId === spotId) ?? null;
  },
};
