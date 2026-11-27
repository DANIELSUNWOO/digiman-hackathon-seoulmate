import { ApiError } from "../../api";
import type { VisitVerifyApi } from "./api";
import type { PickPhoto, ReadPosition, SubmitVisit } from "./types";

export type MockScenario = "data" | "visited" | "missing" | "error" | "denied";

export function createMockVerifyApi(scenario: MockScenario): VisitVerifyApi {
  return {
    getSpot: async (_matchId, spotId) => {
      if (scenario === "error")
        throw new ApiError("NETWORK", "mock network error");
      if (scenario === "missing") return null;
      return {
        spotId,
        name: "카페 어니언 성수",
        visited: scenario === "visited",
      };
    },
  };
}

/** 카메라 권한을 거부한 기기 */
export const deniedPicker: PickPhoto = async () => ({ status: "denied" });

export type MockLocation = "ok" | "far" | "denied" | "off" | "unavailable";

/** far는 서버의 반경 밖 응답까지 흉내 낸다. */
export function createMockLocation(location: MockLocation): {
  readPosition: ReadPosition;
  submit: SubmitVisit;
} {
  return {
    readPosition: async () =>
      location === "ok" || location === "far"
        ? {
            status: "ok",
            position: { lat: 37.5447, lng: 127.0582, accuracy: 20 },
          }
        : { status: location },
    submit: async () => {
      if (location === "far")
        throw new ApiError("HTTP", "mock", 400, { code: "OUT_OF_RANGE" });
    },
  };
}
