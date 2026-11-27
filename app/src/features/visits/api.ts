import { apiRequest } from "../../api";
import type { ReactionType, VisitRecord } from "./types";

export interface VisitsApi {
  /** 최근 인증 순으로 내려온다. */
  list: (matchId: number) => Promise<VisitRecord[]>;
  setReaction: (visitId: number, type: ReactionType) => Promise<void>;
  clearReaction: (visitId: number) => Promise<void>;
  addComment: (visitId: number, content: string) => Promise<void>;
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const visitsApi: VisitsApi = {
  list: (matchId) => apiRequest<VisitRecord[]>(`matches/${matchId}/visits`),
  setReaction: async (visitId, type) => {
    await apiRequest(
      `visits/${visitId}/reaction`,
      jsonRequest("PUT", { type }),
    );
  },
  clearReaction: (visitId) =>
    apiRequest<void>(`visits/${visitId}/reaction`, { method: "DELETE" }),
  addComment: async (visitId, content) => {
    await apiRequest(
      `visits/${visitId}/comments`,
      jsonRequest("POST", { content }),
    );
  },
};
