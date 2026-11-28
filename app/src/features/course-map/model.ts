import { id, parseDetail, type MatchDetail } from "../chat/model";
import type { ChatLocalizedText } from "../chat/viewTypes";

export type CourseSpot = {
  spotId: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  photos: string[];
  reason: ChatLocalizedText | null;
  review: ChatLocalizedText | null;
  visited: boolean;
  visitId: number | null;
};
export type Course = {
  map: {
    mapId: number;
    title: ChatLocalizedText;
    caption: ChatLocalizedText | null;
  };
  progress: { visited: number; required: number | null; total: number };
  spots: CourseSpot[];
};
export type CourseMapPoint = Pick<
  CourseSpot,
  "spotId" | "lat" | "lng" | "visited"
>;
export type CourseData = { match: MatchDetail; course: Course };
function fail(): never {
  throw new Error("Invalid course response");
}
function object(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : fail();
}
function string(v: unknown): string {
  return typeof v === "string" ? v : fail();
}
function localized(v: unknown): ChatLocalizedText {
  const o = object(v);
  const sourceLang = o.sourceLang;
  if (sourceLang !== "ko" && sourceLang !== "ja") return fail();
  return {
    original: string(o.original),
    translated: o.translated === null ? null : string(o.translated),
    sourceLang,
  };
}
function count(v: unknown): number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0
    ? v
    : fail();
}
function coordinate(v: unknown, max: number): number {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max
    ? v
    : fail();
}
export function parseCourse(v: unknown): Course {
  const o = object(v),
    map = object(o.map),
    p = object(o.progress);
  if (!Array.isArray(o.spots)) return fail();
  const seen = new Set<number>(),
    visits = new Set<number>();
  const spots = o.spots.map((v): CourseSpot => {
    const s = object(v),
      spotId = id(s.spotId);
    if (seen.has(spotId)) return fail();
    seen.add(spotId);
    if (typeof s.visited !== "boolean" || !Array.isArray(s.photos))
      return fail();
    const visitId = s.visitId === null ? null : id(s.visitId);
    if (
      s.visited !== (visitId !== null) ||
      (visitId !== null && visits.has(visitId))
    )
      return fail();
    if (visitId !== null) visits.add(visitId);
    return {
      spotId,
      name: string(s.name),
      address: s.address === null ? null : string(s.address),
      lat: coordinate(s.lat, 90),
      lng: coordinate(s.lng, 180),
      photos: s.photos.map(string),
      reason: s.reason === null ? null : localized(s.reason),
      review: s.review === null ? null : localized(s.review),
      visited: s.visited,
      visitId,
    };
  });
  return {
    map: {
      mapId: id(map.mapId),
      title: localized(map.title),
      caption: map.caption === null ? null : localized(map.caption),
    },
    progress: {
      visited: count(p.visited),
      required: p.required === null ? null : count(p.required),
      total: count(p.total),
    },
    spots,
  };
}
export function parseCourseData(
  matchRaw: unknown,
  courseRaw: unknown,
  matchId: number,
): CourseData {
  const match = parseDetail(matchRaw, "traveler"),
    course = parseCourse(courseRaw);
  if (
    match.matchId !== id(matchId) ||
    !match.courseMap ||
    match.courseMap.mapId !== course.map.mapId
  )
    return fail();
  return { match, course };
}
export function canWrite(data: CourseData): boolean {
  return data.match.status === "ON_COURSE";
}
