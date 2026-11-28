// 개발 전용 경로(/dev/place-search)에서 서버 없이 화면 상태를 확인하기 위한 목.
import { ApiError } from "../../api";
import type { PlaceSearchApi } from "./api";
import type { PlaceResult } from "./types";

export type MockScenario = "data" | "empty" | "error" | "unavailable";

const PLACES: PlaceResult[] = [
  {
    name: "카페 어니언 성수",
    address: "서울특별시 성동구 아차산로9길 8",
    lat: 37.5447,
    lng: 127.0582,
    category: "카페",
  },
  {
    name: "성수 연방",
    address: "서울특별시 성동구 성수이로14길 14",
    lat: 37.5413,
    lng: 127.0561,
    category: "복합문화공간",
  },
  {
    name: "주소와 분류가 없는 장소",
    address: null,
    lat: 37.5665,
    lng: 126.978,
    category: null,
  },
];

const FAILURES: Partial<Record<MockScenario, () => ApiError>> = {
  error: () => new ApiError("NETWORK", "mock network error"),
  unavailable: () =>
    new ApiError("HTTP", "mock server error", 503, {
      code: "PLACE_SEARCH_UNAVAILABLE",
    }),
};

export function createMockPlaceSearchApi(
  scenario: MockScenario,
): PlaceSearchApi {
  return {
    search: async () => {
      const failure = FAILURES[scenario];
      if (failure) throw failure();
      return scenario === "empty" ? [] : PLACES;
    },
  };
}
