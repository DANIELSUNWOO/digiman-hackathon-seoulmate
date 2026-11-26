// 개발 전용 경로(/dev/mate-home)에서 서버 없이 화면 상태를 확인하기 위한 목.
import { ApiError } from "../../api";
import type { MateHomeApi } from "./api";
import type { MatchItem, MyMap } from "./types";

export type MockScenario = "data" | "empty" | "error";

const MAPS: MyMap[] = [
  {
    mapId: 1,
    title: "혼자 가기 좋은 성수 카페",
    caption: {
      original: "조용히 책 읽기 좋은 카페만 모았어요",
      translated: "静かに本を読むのにぴったりなカフェだけを集めました",
      sourceLang: "ko",
    },
    spotCount: 6,
    previewCount: 2,
    isPublic: true,
    inUse: true,
    selectedCount: 3,
    travelingCount: 1,
  },
  {
    mapId: 2,
    title: "연남동 산책",
    caption: null,
    spotCount: 4,
    previewCount: 1,
    isPublic: false,
    inUse: false,
  },
];

const MATCHES: MatchItem[] = [
  {
    matchId: 102,
    chatStatus: "LOCKED",
    partner: { nickname: "ゆうと" },
    courseMap: { mapId: 1, title: "혼자 가기 좋은 성수 카페" },
    progress: { visited: 0, required: 3, total: 6 },
    lastVisitAt: null,
  },
  {
    matchId: 101,
    chatStatus: "LOCKED",
    partner: { nickname: "はるか" },
    courseMap: { mapId: 1, title: "혼자 가기 좋은 성수 카페" },
    progress: { visited: 2, required: 3, total: 6 },
    lastVisitAt: "2026-11-29T14:03:00+09:00",
  },
];

export function createMockMateHomeApi(scenario: MockScenario): MateHomeApi {
  const respond = <T>(data: T, empty: T): Promise<T> => {
    if (scenario === "error")
      return Promise.reject(new ApiError("NETWORK", "mock network error"));
    return Promise.resolve(scenario === "empty" ? empty : data);
  };
  return {
    getProfile: () =>
      respond(
        { matchCapacity: { active: MATCHES.length, max: 10 } },
        { matchCapacity: { active: 0, max: 10 } },
      ),
    getMyMaps: () => respond(MAPS, []),
    getActiveMatches: () => respond(MATCHES, []),
  };
}
