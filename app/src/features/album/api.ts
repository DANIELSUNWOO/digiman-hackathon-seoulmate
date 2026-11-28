import { apiRequest } from "../../api";
import type { Album } from "./types";

export interface AlbumApi {
  /** ALBUM-01 */
  get: (matchId: number) => Promise<Album>;
}

export const albumApi: AlbumApi = {
  get: (matchId) => apiRequest<Album>(`matches/${matchId}/album`),
};
