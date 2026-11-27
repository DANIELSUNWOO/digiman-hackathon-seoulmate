import { useRef, useState } from "react";

/** 한 번에 하나만 보낸다. 보내는 중에 또 누르면 무시한다. */
export function useSending() {
  // state는 다음 렌더에야 바뀌어 연속으로 누르면 두 번 보낼 수 있다.
  const busy = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  /** 성공하면 true. 실패는 error에 담는다. */
  const send = async (task: () => Promise<void>): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setSending(true);
    setError(null);
    try {
      await task();
      return true;
    } catch (failure: unknown) {
      setError(failure);
      return false;
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  return { sending, error, send };
}
