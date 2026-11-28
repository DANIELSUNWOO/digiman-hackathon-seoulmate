import { apiRequest } from "../../api";
import type { PlaceResult } from "./types";

export interface PlaceSearchApi {
  /** 최대 5개, 정확도 순. 결과가 없으면 빈 배열 */
  search: (query: string, signal: AbortSignal) => Promise<PlaceResult[]>;
}

// 검색 키는 서버에만 있다. 앱에서 네이버를 직접 부르지 않는다.
export const placeSearchApi: PlaceSearchApi = {
  search: (query, signal) =>
    apiRequest<PlaceResult[]>(
      `places/search?query=${encodeURIComponent(query)}`,
      { signal },
    ),
};
