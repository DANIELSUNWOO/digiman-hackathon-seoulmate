import { ApiError } from "../../api";
import type { ReviewApi } from "./api";
import type { Review, ReviewerRole } from "./types";

export type MockReviews = "none" | "partner" | "both" | "error";
export type MockSubmit =
  "ok" | "network" | "already" | "notCompleted" | "blocked";

const SUBMIT_CODES: Partial<Record<MockSubmit, string>> = {
  already: "ALREADY_REVIEWED",
  notCompleted: "MATCH_NOT_COMPLETED",
  blocked: "MATCH_NOT_ACTIVE",
};

const CREATED_AT = "2026-12-08T21:00:00+09:00";

function partnerReview(role: ReviewerRole): Review {
  const fromMate = role === "TRAVELER";
  return {
    reviewId: 11,
    reviewer: { userId: "partner", nickname: fromMate ? "민지" : "ゆき" },
    rating: 5,
    content: fromMate
      ? {
          original: "코스를 꼼꼼히 다녀 주셔서 고마웠어요.",
          translated: "コースを丁寧に回ってくださってありがとうございました。",
          sourceLang: "ko",
        }
      : {
          original: "おかげで最高の旅になりました",
          translated: "덕분에 최고의 여행이 됐어요",
          sourceLang: "ja",
        },
    createdAt: CREATED_AT,
  };
}

function myReview(userId: string): Review {
  return {
    reviewId: 12,
    reviewer: { userId, nickname: "" },
    rating: 4,
    content: null,
    createdAt: CREATED_AT,
  };
}

export interface MockReviewOptions {
  userId: string;
  role: ReviewerRole;
  reviews: MockReviews;
  submit: MockSubmit;
}

export function createMockReviewApi({
  userId,
  role,
  reviews,
  submit,
}: MockReviewOptions): ReviewApi {
  let written = reviews === "both";
  return {
    list: async () => {
      if (reviews === "error")
        throw new ApiError("NETWORK", "mock network error");
      const partner = reviews === "none" ? [] : [partnerReview(role)];
      return written ? [...partner, myReview(userId)] : partner;
    },
    create: async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (submit === "network")
        throw new ApiError("NETWORK", "mock network error");
      // 이미 쓴 후기가 있으면 다시 읽을 때 함께 내려온다.
      if (submit === "already") written = true;
      const code = SUBMIT_CODES[submit];
      if (code) throw new ApiError("HTTP", "mock", 409, { code });
      return { reviewId: 13 };
    },
  };
}
