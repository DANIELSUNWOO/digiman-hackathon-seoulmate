export type LocalizedText = {
  original: string;
  translated: string | null;
  sourceLang: string;
};
export type UserSummary = {
  userId: string;
  nickname: string | null;
  gender: string | null;
  ageGroup: number | null;
  profileImageUrl: string | null;
  bio: string | null;
};
export type Area = { tagId: number; name: string };
export type AreaCount = Area & { mapCount: number };
export type MapCard = {
  mapId: number;
  title: LocalizedText;
  mate: UserSummary;
  pinCount: number;
  lastUpdatedAt: string;
  selectedCount: number;
  myMatchId: number | null;
  area: Area | null;
};
export type BrowsePage = {
  items: MapCard[];
  totalCount: number;
  emptyReason: "NO_MATE" | "NO_MAP_IN_RANGE" | null;
  page: number;
  hasNext: boolean;
  areas: AreaCount[];
};
export type PreviewSpot = {
  spotId: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  photos: string[];
  reason: LocalizedText | null;
  review: LocalizedText | null;
};
export type MapPreview = {
  mapId: number;
  title: LocalizedText;
  caption: LocalizedText | null;
  mate: UserSummary | null;
  spotCount: number;
  hiddenSpotCount: number;
  lastUpdatedAt: string;
  previewSpots: PreviewSpot[];
  myMatchId: number | null;
  slots: { total: number; used: number };
};

export class InvalidMapResponse extends Error {
  constructor() {
    super("Invalid map response");
    this.name = "InvalidMapResponse";
  }
}
function bad(): never {
  throw new InvalidMapResponse();
}
function obj(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : bad();
}
function str(v: unknown): string {
  return typeof v === "string" ? v : bad();
}
function count(v: unknown): number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : bad();
}
export function positiveId(v: unknown): number {
  const n = count(v);
  return n > 0 ? n : bad();
}
function nullable<T>(v: unknown, f: (x: unknown) => T): T | null {
  return v === null ? null : f(v);
}
function list<T>(v: unknown, f: (x: unknown) => T): T[] {
  return Array.isArray(v) ? v.map(f) : bad();
}
function localized(v: unknown): LocalizedText {
  const o = obj(v);
  return {
    original: str(o.original),
    translated: nullable(o.translated, str),
    sourceLang: str(o.sourceLang),
  };
}
function user(v: unknown): UserSummary {
  const o = obj(v);
  return {
    userId: str(o.userId),
    nickname: nullable(o.nickname, str),
    gender: nullable(o.gender, str),
    ageGroup: nullable(o.ageGroup, count),
    profileImageUrl: nullable(o.profileImageUrl, str),
    bio: nullable(o.bio, str),
  };
}
function area(v: unknown): Area {
  const o = obj(v);
  return { tagId: positiveId(o.tagId), name: str(o.name) };
}
function card(v: unknown): MapCard {
  const o = obj(v);
  return {
    mapId: positiveId(o.mapId),
    title: localized(o.title),
    mate: user(o.mate),
    pinCount: count(o.pinCount),
    lastUpdatedAt: str(o.lastUpdatedAt),
    selectedCount: count(o.selectedCount),
    myMatchId: nullable(o.myMatchId, positiveId),
    area: nullable(o.area, area),
  };
}
function coordinate(v: unknown, min: number, max: number): number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
    ? v
    : bad();
}
function spot(v: unknown): PreviewSpot {
  const o = obj(v);
  return {
    spotId: positiveId(o.spotId),
    name: str(o.name),
    address: nullable(o.address, str),
    lat: coordinate(o.lat, -90, 90),
    lng: coordinate(o.lng, -180, 180),
    photos: list(o.photos, str),
    reason: nullable(o.reason, localized),
    review: nullable(o.review, localized),
  };
}
export function parseBrowsePage(v: unknown): BrowsePage {
  const o = obj(v);
  const emptyReason = o.emptyReason;
  if (
    emptyReason !== null &&
    emptyReason !== "NO_MATE" &&
    emptyReason !== "NO_MAP_IN_RANGE"
  )
    bad();
  if (typeof o.hasNext !== "boolean") bad();
  return {
    items: list(o.items, card),
    totalCount: count(o.totalCount),
    emptyReason,
    page: count(o.page),
    hasNext: o.hasNext,
    areas: list(o.areas, (x) => {
      const a = obj(x);
      return { ...area(a), mapCount: count(a.mapCount) };
    }),
  };
}
export function parseMapPreview(v: unknown): MapPreview {
  const o = obj(v);
  const slots = obj(o.slots);
  return {
    mapId: positiveId(o.mapId),
    title: localized(o.title),
    caption: nullable(o.caption, localized),
    mate: nullable(o.mate, user),
    spotCount: count(o.spotCount),
    hiddenSpotCount: count(o.hiddenSpotCount),
    lastUpdatedAt: str(o.lastUpdatedAt),
    previewSpots: list(o.previewSpots, spot),
    myMatchId: nullable(o.myMatchId, positiveId),
    slots: { total: count(slots.total), used: count(slots.used) },
  };
}
