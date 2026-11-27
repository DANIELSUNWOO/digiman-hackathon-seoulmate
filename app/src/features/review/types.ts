// API 명세 v1.9 REVIEW-01·02
import type { Translated } from "../translation";

export type ReviewerRole = "TRAVELER" | "MATE";

export interface Reviewer {
  userId: string;
  nickname: string;
}

export interface Review {
  reviewId: number;
  /** 쓴 사람을 알 수 없으면 null */
  reviewer: Reviewer | null;
  rating: number;
  content: Translated | null;
  createdAt: string;
}

export interface ReviewRequest {
  rating: number;
  content?: string;
}

export interface ReviewCreated {
  reviewId: number;
}
