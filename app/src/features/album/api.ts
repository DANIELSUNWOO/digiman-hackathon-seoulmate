import { apiRequest } from "../../api";
import type { Album, TripRange } from "./types";

export interface AlbumApi {
  /** ALBUM-01 */
  get: (matchId: number) => Promise<Album>;
  /** MATCH-03에서 여행 일정만 읽는다. */
  getTrip: (matchId: number) => Promise<TripRange | null>;
}

export const albumApi: AlbumApi = {
  get: (matchId) => apiRequest<Album>(`matches/${matchId}/album`),
  getTrip: async (matchId) => {
    const match = await apiRequest<{ trip: TripRange | null }>(
      `matches/${matchId}`,
    );
    return match.trip;
  },
};
