import { useRef, useState } from "react";
import type {
  LocationProblem,
  ReadPosition,
  SubmitStage,
  SubmitVisit,
  VisitCreated,
  VisitDraft,
} from "./types";

// 이보다 오차가 크면 반경 밖 안내에 위치 정확도 도움말을 붙인다. 판정은 서버가 한다.
const LOW_ACCURACY_M = 100;

export type Verification =
  | { status: "idle" }
  | { status: "locating" }
  | { status: SubmitStage }
  | { status: "done"; result: VisitCreated }
  | { status: "noLocation"; problem: LocationProblem }
  | { status: "failed"; error: unknown; lowAccuracy: boolean };

export interface VerificationFlow {
  state: Verification;
  /** 위치를 얻고 제출한다. 진행 중에 또 부르면 무시한다. */
  start: (draft: VisitDraft) => Promise<void>;
  close: () => void;
}

export function useVerification(
  readPosition: ReadPosition,
  submit: SubmitVisit,
): VerificationFlow {
  const [state, setState] = useState<Verification>({ status: "idle" });
  const busy = useRef(false);

  const run = async (draft: VisitDraft): Promise<Verification> => {
    setState({ status: "locating" });
    // 재시도할 때마다 위치를 새로 얻는다.
    const located = await readPosition();
    if (located.status !== "ok")
      return { status: "noLocation", problem: located.status };
    const { position } = located;
    try {
      const result = await submit(draft, position, (status) =>
        setState({ status }),
      );
      return { status: "done", result };
    } catch (error: unknown) {
      const lowAccuracy = (position.accuracy ?? 0) > LOW_ACCURACY_M;
      return { status: "failed", error, lowAccuracy };
    }
  };

  const start = async (draft: VisitDraft): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    try {
      setState(await run(draft));
    } finally {
      busy.current = false;
    }
  };

  const close = (): void => {
    if (!busy.current) setState({ status: "idle" });
  };

  return { state, start, close };
}
