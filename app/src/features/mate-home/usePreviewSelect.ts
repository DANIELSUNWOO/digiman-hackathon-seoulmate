import { useRef, useState } from "react";
import type { MateHomeApi } from "./api";
import { errorMessage } from "./errors";
import { MAP_PREVIEW_SPOTS } from "./model";
import { strings } from "./strings";
import type { MapSpot } from "./types";
import { useIsMounted } from "./useIsMounted";

export interface PreviewSelect {
  selected: number[];
  /** 2곳이 찬 상태에서 고르려다 막힌 스팟 */
  blockedId: number | null;
  saving: boolean;
  error: string | null;
  toggle: (spotId: number) => void;
  save: () => Promise<void>;
}

export function usePreviewSelect(
  api: MateHomeApi,
  mapId: number,
  spots: MapSpot[],
  onSaved: () => void,
): PreviewSelect {
  const [selected, setSelected] = useState(() =>
    spots.filter((spot) => spot.isPreview).map((spot) => spot.spotId),
  );
  const [blockedId, setBlockedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useIsMounted();

  const toggle = (spotId: number): void => {
    if (busy.current) return;
    const chosen = selected.includes(spotId);
    const blocked = !chosen && selected.length >= MAP_PREVIEW_SPOTS;
    setBlockedId(blocked ? spotId : null);
    if (blocked) return;
    setSelected(
      chosen ? selected.filter((id) => id !== spotId) : [...selected, spotId],
    );
  };

  const save = async (): Promise<void> => {
    if (busy.current || selected.length !== MAP_PREVIEW_SPOTS) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await api.setPreviews(mapId, selected);
      // 성공하면 잠근 채로 둔다. 화면이 넘어가는 동안 또 저장하지 않는다.
      if (mounted.current) onSaved();
    } catch (cause: unknown) {
      busy.current = false;
      setSaving(false);
      setError(errorMessage(cause, strings.errorAction));
    }
  };

  return { selected, blockedId, saving, error, toggle, save };
}
