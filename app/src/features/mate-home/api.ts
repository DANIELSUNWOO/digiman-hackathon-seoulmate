import { apiRequest } from "../../api";
import type {
  EndedMatch,
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
  getEndedMatches: () => Promise<EndedMatch[]>;
  getMapDetail: (mapId: number) => Promise<MapDetail>;
  createMap: (input: MapInput) => Promise<{ mapId: number }>;
  /** 바뀐 값만 보낸다. 한 줄 소개(caption)를 보내면 서버가 번역을 다시 한다. */
  updateMap: (mapId: number, changes: Partial<MapInput>) => Promise<unknown>;
  deleteMap: (mapId: number) => Promise<void>;
  /** MAP-06. 정확히 2곳이며 기존 공개 스팟을 바꾼다. */
  setPreviews: (mapId: number, spotIds: number[]) => Promise<unknown>;
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
  getEndedMatches: () => apiRequest<EndedMatch[]>("matches?state=ended"),
  getMapDetail: (mapId) => apiRequest<MapDetail>(`maps/${mapId}`),
  createMap: (input) =>
    apiRequest<{ mapId: number }>("maps", jsonRequest("POST", input)),
  updateMap: (mapId, changes) =>
    apiRequest(`maps/${mapId}`, jsonRequest("PATCH", changes)),
  deleteMap: (mapId) => apiRequest<void>(`maps/${mapId}`, { method: "DELETE" }),
  setPreviews: (mapId, spotIds) =>
    apiRequest(`maps/${mapId}/previews`, jsonRequest("PUT", { spotIds })),
};
