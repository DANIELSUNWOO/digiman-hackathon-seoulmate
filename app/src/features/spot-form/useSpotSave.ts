import { useRef, useState } from "react";
import { useIsMounted } from "../mate-home";
import type { SaveProgress, SpotInput, SubmitSpot } from "./types";

export interface SpotSave {
  /** 저장 중이 아니면 null */
  progress: SaveProgress | null;
  error: unknown;
  /** 진행 중에 또 부르면 무시한다. 실패해도 입력값은 그대로 둔다. */
  save: (input: SpotInput) => Promise<void>;
}

export function useSpotSave(submit: SubmitSpot, onSaved: () => void): SpotSave {
  const [progress, setProgress] = useState<SaveProgress | null>(null);
  const [error, setError] = useState<unknown>(null);
  const busy = useRef(false);
  const mounted = useIsMounted();

  const save = async (input: SpotInput): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setProgress({ stage: "saving" });
    try {
      await submit(input, setProgress);
      // 성공하면 잠근 채로 둔다. 화면이 넘어가는 동안 또 저장하지 않는다.
      if (mounted.current) onSaved();
    } catch (cause: unknown) {
      busy.current = false;
      setProgress(null);
      setError(cause);
    }
  };

  return { progress, error, save };
}
