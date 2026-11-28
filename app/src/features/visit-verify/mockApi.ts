import { ApiError } from "../../api";
import type { VisitVerifyApi } from "./api";
import type { PickPhoto, ReadPosition } from "./types";

export type MockScenario = "data" | "visited" | "missing" | "error" | "denied";
export type MockSubmit = "ok" | "far" | "uploadFail" | "already";
export type MockLocation = "ok" | "denied" | "off" | "unavailable";

const SUBMIT_ERRORS: Partial<Record<MockSubmit, string>> = {
  far: "OUT_OF_RANGE",
  already: "ALREADY_VISITED",
};

export function createMockVerifyApi(
  scenario: MockScenario,
  submit: MockSubmit,
): VisitVerifyApi {
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
    uploadPhoto: async (uri) => {
      if (submit === "uploadFail") throw new Error("mock upload failure");
      return uri;
    },
    verify: async (_matchId, { spotId }) => {
      const code = SUBMIT_ERRORS[submit];
      if (code) throw new ApiError("HTTP", "mock", 400, { code });
      return {
        visitId: 900,
        spotId,
        verifiedAt: "2026-11-29T14:03:00+09:00",
        progress: { visited: 2, required: 2, total: 5 },
        chatReady: true,
      };
    },
  };
}

/** 카메라 권한을 거부한 기기 */
export const deniedPicker: PickPhoto = async () => ({ status: "denied" });

export function createMockPosition(location: MockLocation): ReadPosition {
  return async () =>
    location === "ok"
      ? {
          status: "ok",
          position: { lat: 37.5447, lng: 127.0582, accuracy: 20 },
        }
      : { status: location };
}
