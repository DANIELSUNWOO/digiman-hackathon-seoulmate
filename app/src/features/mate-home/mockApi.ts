// 개발 전용 경로(/dev/mate-home)에서 서버 없이 화면 상태를 확인하기 위한 목.
import { ApiError } from "../../api";
import type { MateHomeApi } from "./api";
import { ENDED_MATCHES, MAPS, MATCHES, mockSpots } from "./mockData";
import type { MapDetail, MapInput, MyMap } from "./types";

export type MockScenario = "data" | "empty" | "error";

function serverError(status: number, code: string) {
  return new ApiError("HTTP", "mock server error", status, { code });
}

function captionOf(text: string): MyMap["caption"] {
  return text ? { original: text, translated: null, sourceLang: "ko" } : null;
}

function newMap(mapId: number, { title, caption }: MapInput): MyMap {
  return {
    mapId,
    title,
    caption: captionOf(caption),
    spotCount: 0,
    previewCount: 0,
    isPublic: false,
    inUse: false,
    selectedCount: 0,
    travelingCount: 0,
  };
}

function applyChanges(map: MyMap, { title, caption }: Partial<MapInput>) {
  return {
    ...map,
    title: title ?? map.title,
    caption: caption === undefined ? map.caption : captionOf(caption),
  };
}

/** 지도 생성·수정·삭제 결과를 목록에 반영하는 메모리 저장소 */
function createMapStore(initial: MyMap[]) {
  let maps = initial;
  const find = (mapId: number): MyMap => {
    const map = maps.find((item) => item.mapId === mapId);
    if (!map) throw serverError(404, "MAP_NOT_FOUND");
    return map;
  };
  const findEditable = (mapId: number) => {
    const map = find(mapId);
    if (map.inUse) throw serverError(409, "MAP_LOCKED");
    return map;
  };
  return {
    list: () => maps,
    detail: (mapId: number): MapDetail => {
      const map = find(mapId);
      const { title, caption, isPublic } = map;
      return { mapId, title, caption, isPublic, spots: mockSpots(map) };
    },
    create: (input: MapInput) => {
      const mapId = Math.max(0, ...maps.map((map) => map.mapId)) + 1;
      maps = [...maps, newMap(mapId, input)];
      return { mapId };
    },
    update: (mapId: number, changes: Partial<MapInput>) => {
      findEditable(mapId);
      maps = maps.map((map) =>
        map.mapId === mapId ? applyChanges(map, changes) : map,
      );
    },
    remove: (mapId: number) => {
      if (findEditable(mapId).selectedCount)
        throw serverError(409, "MAP_IN_USE");
      maps = maps.filter((map) => map.mapId !== mapId);
    },
  };
}

export function createMockMateHomeApi(scenario: MockScenario): MateHomeApi {
  const store = createMapStore(scenario === "data" ? MAPS : []);
  const matches = scenario === "data" ? MATCHES : [];
  const respond = <T>(action: () => T): Promise<T> =>
    new Promise((resolve, reject) => {
      if (scenario === "error")
        return reject(new ApiError("NETWORK", "mock network error"));
      try {
        resolve(action());
      } catch (error) {
        reject(error);
      }
    });

  return {
    getProfile: () =>
      respond(() => ({
        matchCapacity: { active: matches.length, max: 10 },
      })),
    getActiveMatches: () => respond(() => matches),
    getEndedMatches: () =>
      respond(() => (scenario === "data" ? ENDED_MATCHES : [])),
    getMyMaps: () => respond(store.list),
    getMapDetail: (mapId) => respond(() => store.detail(mapId)),
    createMap: (input) => respond(() => store.create(input)),
    updateMap: (mapId, changes) => respond(() => store.update(mapId, changes)),
    deleteMap: (mapId) => respond(() => store.remove(mapId)),
    // 목 스팟은 저장하지 않아 선택 결과가 상세에 남지 않는다.
    setPreviews: () => respond(() => undefined),
  };
}
