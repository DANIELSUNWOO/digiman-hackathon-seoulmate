import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

/** One navigation per focus, following the onboarding dismiss convention. */
export function useNavigationLock() {
  const focused = useRef(false);
  const navigating = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      navigating.current = false;
      return () => {
        focused.current = false;
        navigating.current = false;
      };
    }, []),
  );
  return (action: () => void) => {
    if (!focused.current || navigating.current) return;
    navigating.current = true;
    try {
      action();
    } catch (error) {
      navigating.current = false;
      throw error;
    }
  };
}
