import { ApiError } from "../../api";
import type { VisitVerifyApi } from "./api";
import type { PickPhoto } from "./types";

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
