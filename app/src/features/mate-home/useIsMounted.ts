import { useEffect, useRef } from "react";

/** 저장·삭제 중에 화면을 벗어났는지 확인한다. 벗어났으면 다시 이동시키지 않는다. */
export function useIsMounted() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
