import { useRef, useState } from "react";
import { Keyboard } from "react-native";
import type { PlaceResult } from "../place-search";
import type { SpotLocation } from "./types";

/** 서버 SPOT-01의 name 상한 */
export const NAME_MAX = 100;

export interface SpotDraft {
  /** 고른 장소. 시트가 닫히는 동안에도 내용이 남도록 비우지 않는다. */
  draft: SpotLocation | null;
  visible: boolean;
  select: (place: PlaceResult) => void;
  rename: (name: string) => void;
  confirm: () => void;
  cancel: () => void;
  dismissed: () => void;
}

export function useSpotDraft(
  onPicked: (location: SpotLocation) => void,
): SpotDraft {
  const [draft, setDraft] = useState<SpotLocation | null>(null);
  const [visible, setVisible] = useState(false);
  // 시트가 다 닫힌 뒤에 넘긴다. 연속으로 눌러도 한 번만 넘어간다.
  const confirmed = useRef<SpotLocation | null>(null);

  const select = ({ name, address, lat, lng }: PlaceResult): void => {
    Keyboard.dismiss();
    confirmed.current = null;
    setDraft({ name: name.slice(0, NAME_MAX), address, lat, lng });
    setVisible(true);
  };

  const rename = (name: string): void => {
    setDraft((previous) => previous && { ...previous, name });
  };

  const confirm = (): void => {
    const name = draft?.name.trim();
    if (!draft || !name || !visible) return;
    confirmed.current = { ...draft, name };
    setVisible(false);
  };

  const cancel = (): void => setVisible(false);

  const dismissed = (): void => {
    const location = confirmed.current;
    confirmed.current = null;
    if (location) onPicked(location);
  };

  return { draft, visible, select, rename, confirm, cancel, dismissed };
}
