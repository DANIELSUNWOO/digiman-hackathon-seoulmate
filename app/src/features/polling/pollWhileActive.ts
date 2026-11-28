import { AppState } from "react-native";

export interface ActivePoll {
  /** 백그라운드가 아니어서 주기 조회 중인지 */
  isRunning: () => boolean;
  stop: () => void;
}

/**
 * 바로 한 번, 이후 주기적으로 refresh를 부른다. 백그라운드에서는 멈추고
 * 앱이 다시 앞으로 오면 바로 부른다. stop으로 전부 해제한다.
 */
export function pollWhileActive(
  refresh: () => void,
  intervalMs: number,
): ActivePoll {
  let timer: ReturnType<typeof setInterval> | null = null;
  const pause = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const start = (): void => {
    pause();
    refresh();
    timer = setInterval(refresh, intervalMs);
  };
  // 실행 직후에는 상태를 아직 모를 수 있어 background만 제외한다.
  if (AppState.currentState !== "background") start();
  const appState = AppState.addEventListener("change", (next) => {
    if (next === "active") start();
    else pause();
  });
  return {
    isRunning: () => timer !== null,
    stop: () => {
      pause();
      appState.remove();
    },
  };
}
