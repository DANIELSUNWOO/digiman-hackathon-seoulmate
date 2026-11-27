import { apiRequest } from "../../api";
import type { MatchItem, MateProfile, MyMap } from "./types";

export type MateHomeApi = {
  getProfile: () => Promise<MateProfile>;
  getMyMaps: () => Promise<MyMap[]>;
  getActiveMatches: () => Promise<MatchItem[]>;
};

export const mateHomeApi: MateHomeApi = {
  getProfile: () => apiRequest<MateProfile>("users/me"),
  getMyMaps: () => apiRequest<MyMap[]>("maps/me"),
  getActiveMatches: () => apiRequest<MatchItem[]>("matches?state=active"),
};
