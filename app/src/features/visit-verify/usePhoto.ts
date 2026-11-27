import { useRef, useState } from "react";
import type { PhotoSource, PickedPhoto, PickPhoto } from "./types";

export interface PhotoPicking {
  photo: PickedPhoto | null;
  preparing: boolean;
  problem: "denied" | "failed" | null;
  choose: (source: PhotoSource) => Promise<void>;
}

export function usePhoto(pick: PickPhoto): PhotoPicking {
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [problem, setProblem] = useState<PhotoPicking["problem"]>(null);
  // 연속으로 눌러도 선택기는 한 번만 연다.
  const busy = useRef(false);

  const choose = async (source: PhotoSource): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    setPreparing(true);
    setProblem(null);
    try {
      const result = await pick(source);
      if (result.status === "picked") setPhoto(result.photo);
      if (result.status === "denied") setProblem("denied");
    } catch {
      setProblem("failed");
    } finally {
      busy.current = false;
      setPreparing(false);
    }
  };

  return { photo, preparing, problem, choose };
}
