import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useNavigationLock } from "../chat/useNavigationLock";

/** Invalidates callbacks from an earlier focus or route identity. */
export function useScopedNavigation(identity: string) {
  const navigate = useNavigationLock();
  const liveIdentity = useRef({ value: identity, revision: 0 });
  if (liveIdentity.current.value !== identity) {
    liveIdentity.current = {
      value: identity,
      revision: liveIdentity.current.revision + 1,
    };
  }
  const identityRevision = liveIdentity.current.revision;
  const generation = useRef(0);
  const [, render] = useState(0);
  useFocusEffect(
    useCallback(() => {
      generation.current++;
      render((value) => value + 1);
      return () => {
        generation.current++;
      };
    }, []),
  );
  const current = generation.current;
  return (action: () => void) => {
    if (
      liveIdentity.current.value !== identity ||
      liveIdentity.current.revision !== identityRevision ||
      generation.current !== current
    )
      return;
    navigate(action);
  };
}
