// 개발 전용 목 데이터.
import type { MapSpot, MatchItem, MyMap } from "./types";

export const MAPS: MyMap[] = [
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
    selectedCount: 0,
    travelingCount: 0,
  },
  {
    mapId: 3,
    title: "망원 시장 먹거리",
    caption: null,
    spotCount: 5,
    previewCount: 2,
    isPublic: true,
    inUse: false,
    // 코스로 선택된 적이 있어 삭제하면 MAP_IN_USE가 난다.
    selectedCount: 1,
    travelingCount: 0,
  },
];

export const MATCHES: MatchItem[] = [
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
  {
    matchId: 103,
    chatStatus: "READY",
    partner: { nickname: "みお" },
    courseMap: { mapId: 1, title: "혼자 가기 좋은 성수 카페" },
    progress: { visited: 3, required: 3, total: 6 },
    lastVisitAt: "2026-11-29T11:20:00+09:00",
  },
  {
    matchId: 104,
    chatStatus: "OPEN",
    partner: { nickname: "そら" },
    courseMap: { mapId: 1, title: "혼자 가기 좋은 성수 카페" },
    progress: { visited: 4, required: 3, total: 6 },
    lastVisitAt: "2026-11-28T18:45:00+09:00",
  },
];

function mockPhoto(index: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" data-spot="${index}"><rect width="1" height="1" fill="#477EFF"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function mockSpots(map: MyMap): MapSpot[] {
  return Array.from({ length: map.spotCount }, (_, index) => ({
    spotId: map.mapId * 100 + index,
    name: `${map.title} ${index + 1}번 스팟`,
    address: "서울 성동구 아차산로9길 8",
    lat: 37.5447,
    lng: 127.0582,
    photos: [mockPhoto(index)],
    reason: {
      original: "창가 자리가 조용해요",
      translated: null,
      sourceLang: "ko",
    },
    review: {
      original: "오전 10시 전에 가면 한적해요",
      translated: null,
      sourceLang: "ko",
    },
    isPreview: index < map.previewCount,
  }));
}
