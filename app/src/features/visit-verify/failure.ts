import { canRetry, errorText, serverCode } from "./errors";
import { strings } from "./strings";
import type { LocationProblem } from "./types";
import type { Verification } from "./useVerification";

export interface FailureCopy {
  title: string;
  body: string;
  /** 같은 내용으로 다시 시도할 수 있는지 */
  retry: boolean;
  /** 앱 설정으로 보내야 하는지 */
  settings?: boolean;
  /** 반경 밖 */
  far?: boolean;
}

const LOCATION: Record<LocationProblem, FailureCopy> = {
  denied: {
    title: strings.deniedTitle,
    body: strings.deniedBody,
    retry: true,
    settings: true,
  },
  off: {
    title: strings.servicesOffTitle,
    body: strings.servicesOffBody,
    retry: true,
  },
  unavailable: {
    title: strings.unavailableTitle,
    body: strings.unavailableBody,
    retry: true,
  },
};

type Failed = Extract<Verification, { status: "noLocation" | "failed" }>;

export function failureCopy(state: Failed): FailureCopy {
  if (state.status === "noLocation") return LOCATION[state.problem];
  const { error, lowAccuracy } = state;
  const code = serverCode(error);
  if (code === "LOCATION_REQUIRED") return LOCATION.denied;
  if (code === "ALREADY_VISITED")
    return {
      title: strings.alreadyVisited,
      body: strings.errorVisited,
      retry: false,
    };
  if (code === "OUT_OF_RANGE")
    return {
      title: strings.farTitle,
      body: lowAccuracy
        ? `${strings.farBody}\n${strings.lowAccuracy}`
        : strings.farBody,
      retry: true,
      far: true,
    };
  return {
    title: strings.failedTitle,
    body: errorText(error, strings.errorSubmit),
    retry: canRetry(error),
  };
}
