import { apiRequest } from "../../api";
import type { VisitRecord } from "./types";

export interface VisitsApi {
  /** 최근 인증 순으로 내려온다. */
  list: (matchId: number) => Promise<VisitRecord[]>;
}

export const visitsApi: VisitsApi = {
  list: (matchId) => apiRequest<VisitRecord[]>(`matches/${matchId}/visits`),
};
