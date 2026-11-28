import { apiRequest } from "../../api";
import { parseBrowsePage, parseMapPreview, positiveId } from "./model";
export type Sort = "PINS_ASC" | "PINS_DESC" | "RECENT" | "POPULAR";
export type Filters = {
  sort?: Sort;
  minPins?: number;
  maxPins?: number;
  areaTagId?: number;
  size?: number;
};
export type GetRequest = (
  path: string,
  init: RequestInit,
  token: string,
) => Promise<unknown>;
const defaultRequest: GetRequest = (path, init, token) =>
  apiRequest<unknown>(path, init, token);
function integer(
  n: unknown,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): n is number {
  return (
    typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= max
  );
}
const INT32_MAX = 2_147_483_647;
export function captureFilters(input: Filters): Filters {
  const { sort, minPins, maxPins, areaTagId, size } = input;
  if (
    sort !== undefined &&
    !["PINS_ASC", "PINS_DESC", "RECENT", "POPULAR"].includes(sort)
  )
    throw new RangeError("Invalid sort");
  if (minPins !== undefined && !integer(minPins, 5, INT32_MAX))
    throw new RangeError("Invalid minPins");
  if (
    maxPins !== undefined &&
    (!integer(maxPins, 5, INT32_MAX) || maxPins < (minPins ?? 5))
  )
    throw new RangeError("Invalid maxPins");
  if (areaTagId !== undefined && !integer(areaTagId, 1))
    throw new RangeError("Invalid areaTagId");
  if (size !== undefined && !integer(size, 1, 50))
    throw new RangeError("Invalid size");
  return { sort, minPins, maxPins, areaTagId, size };
}
function tokenValue(token: string): string {
  if (typeof token !== "string" || !token.trim())
    throw new Error("Token required");
  return token;
}
export function createMapBrowseApi(request: GetRequest = defaultRequest) {
  return {
    async browse(
      token: string,
      filters: Filters,
      page: number,
      signal?: AbortSignal,
    ) {
      const t = tokenValue(token);
      const f = captureFilters(filters);
      if (!integer(page, 0, INT32_MAX)) throw new RangeError("Invalid page");
      const q = new URLSearchParams();
      if (f.sort !== undefined) q.set("sort", f.sort);
      if (f.minPins !== undefined) q.set("minPins", String(f.minPins));
      if (f.maxPins !== undefined) q.set("maxPins", String(f.maxPins));
      if (f.areaTagId !== undefined) q.set("areaTagId", String(f.areaTagId));
      q.set("page", String(page));
      if (f.size !== undefined) q.set("size", String(f.size));
      const result = parseBrowsePage(
        await request(`/maps?${q.toString()}`, { method: "GET", signal }, t),
      );
      if (result.page !== page) throw new Error("Unexpected response page");
      return result;
    },
    async preview(token: string, mapId: number, signal?: AbortSignal) {
      const t = tokenValue(token);
      positiveId(mapId);
      const result = parseMapPreview(
        await request(`/maps/${mapId}/preview`, { method: "GET", signal }, t),
      );
      if (result.mapId !== mapId) throw new Error("Unexpected map ID");
      return result;
    },
  };
}
export type MapBrowseApi = ReturnType<typeof createMapBrowseApi>;
