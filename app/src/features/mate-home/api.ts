import { apiRequest } from "../../api";
import type {
  MapDetail,
  MapInput,
  MatchItem,
  MateProfile,
  MyMap,
} from "./types";

export type MateHomeApi = {
  getProfile: () => Promise<MateProfile>;
  getMyMaps: () => Promise<MyMap[]>;
  getActiveMatches: () => Promise<MatchItem[]>;
  getMapDetail: (mapId: number) => Promise<MapDetail>;
  createMap: (input: MapInput) => Promise<{ mapId: number }>;
  /** 바뀐 값만 보낸다. 캡션을 보내면 서버가 번역을 다시 한다. */
  updateMap: (mapId: number, changes: Partial<MapInput>) => Promise<unknown>;
  deleteMap: (mapId: number) => Promise<void>;
};

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const mateHomeApi: MateHomeApi = {
  getProfile: () => apiRequest<MateProfile>("users/me"),
  getMyMaps: () => apiRequest<MyMap[]>("maps/me"),
  getActiveMatches: () => apiRequest<MatchItem[]>("matches?state=active"),
  getMapDetail: (mapId) => apiRequest<MapDetail>(`maps/${mapId}`),
  createMap: (input) =>
    apiRequest<{ mapId: number }>("maps", jsonRequest("POST", input)),
  updateMap: (mapId, changes) =>
    apiRequest(`maps/${mapId}`, jsonRequest("PATCH", changes)),
  deleteMap: (mapId) => apiRequest<void>(`maps/${mapId}`, { method: "DELETE" }),
};
