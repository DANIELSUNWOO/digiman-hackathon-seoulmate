import { ApiError } from "../../api";
import type { VisitsApi } from "./api";
import type { VisitRecord } from "./types";

export type MockScenario = "data" | "empty" | "error" | "actionError";

// 1×1 회색 PNG. 네트워크 없이 사진 자리를 채운다.
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8d+/efwAIvAN9pVxJRwAAAABJRU5ErkJggg==";

const VISITS: VisitRecord[] = [
  {
    visitId: 802,
    spot: { spotId: 32, name: "서울숲 은행나무길" },
    photoUrl: "https://photo.invalid/missing.jpg",
    review: {
      original: "黄色い道がとてもきれいでした",
      translated: null,
      sourceLang: "ja",
    },
    verifiedAt: "2026-11-29T16:20:00+09:00",
    reaction: null,
    comments: [],
  },
  {
    visitId: 801,
    spot: { spotId: 31, name: "카페 어니언 성수" },
    photoUrl: PHOTO,
    review: {
      original: "窓際の席が本当に落ち着きました",
      translated: "창가 자리가 정말 편안했어요",
      sourceLang: "ja",
    },
    verifiedAt: "2026-11-29T14:03:00+09:00",
    reaction: "LIKE",
    comments: [
      {
        commentId: 9001,
        content: {
          original: "거기 창가 최고죠!",
          translated: "あの窓際は最高ですよね！",
          sourceLang: "ko",
        },
        createdAt: "2026-11-29T14:10:00+09:00",
      },
    ],
  },
];

/** 리액션·댓글이 반영되는 목. actionError는 읽기만 되고 쓰기는 실패한다. */
export function createMockVisitsApi(scenario: MockScenario): VisitsApi {
  let visits = scenario === "empty" ? [] : VISITS;
  let nextCommentId = 9100;

  const write = async (
    visitId: number,
    change: (visit: VisitRecord) => VisitRecord,
  ): Promise<void> => {
    if (scenario === "actionError")
      throw new ApiError("NETWORK", "mock network error");
    visits = visits.map((visit) =>
      visit.visitId === visitId ? change(visit) : visit,
    );
  };

  return {
    list: async () => {
      if (scenario === "error")
        throw new ApiError("NETWORK", "mock network error");
      return visits;
    },
    setReaction: (visitId, reaction) =>
      write(visitId, (visit) => ({ ...visit, reaction })),
    clearReaction: (visitId) =>
      write(visitId, (visit) => ({ ...visit, reaction: null })),
    addComment: (visitId, original) =>
      write(visitId, (visit) => ({
        ...visit,
        comments: [
          ...visit.comments,
          {
            commentId: nextCommentId++,
            content: { original, translated: null, sourceLang: "ko" },
            createdAt: "2026-11-29T17:00:00+09:00",
          },
        ],
      })),
  };
}
