import { apiRequest } from "../../api";
import type { Review, ReviewCreated, ReviewRequest } from "./types";

export interface ReviewApi {
  /** REVIEW-02 작성 순. 내 후기와 상대 후기가 함께 온다. */
  list: (matchId: number) => Promise<Review[]>;
  /** REVIEW-01. 받는 사람은 서버가 매칭 상대로 정한다. */
  create: (matchId: number, request: ReviewRequest) => Promise<ReviewCreated>;
}

export const reviewApi: ReviewApi = {
  list: (matchId) => apiRequest<Review[]>(`matches/${matchId}/reviews`),
  create: (matchId, request) =>
    apiRequest<ReviewCreated>(`matches/${matchId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }),
};
