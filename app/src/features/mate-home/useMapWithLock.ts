import { useCallback } from "react";
import type { MateHomeApi } from "./api";
import { useLoad } from "./useLoad";

/** 지도 상세에는 inUse가 없어 내 지도 목록에서 잠금 여부를 함께 확인한다. */
export function useMapWithLock(api: MateHomeApi, mapId: number) {
  const load = useCallback(async () => {
    const [map, myMaps] = await Promise.all([
      api.getMapDetail(mapId),
      api.getMyMaps(),
    ]);
    const locked = myMaps.some((item) => item.mapId === mapId && item.inUse);
    return { map, locked };
  }, [api, mapId]);
  return useLoad(load);
}
