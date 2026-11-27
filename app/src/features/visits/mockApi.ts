import { ApiError } from "../../api";
import type { VisitsApi } from "./api";
import type { VisitRecord } from "./types";

export type MockScenario = "data" | "empty" | "error";

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
  },
];

export function createMockVisitsApi(scenario: MockScenario): VisitsApi {
  return {
    list: async () => {
      if (scenario === "error")
        throw new ApiError("NETWORK", "mock network error");
      return scenario === "empty" ? [] : VISITS;
    },
  };
}
