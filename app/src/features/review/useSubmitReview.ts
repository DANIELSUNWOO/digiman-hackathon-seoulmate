import { useRef, useState } from "react";
import type { ReviewApi } from "./api";
import { serverCode } from "./errors";
import type { ReviewRequest } from "./types";

export interface SubmitCallbacks {
  onSent: (request: ReviewRequest, reviewId: number) => void;
  /** 서버에 내 후기가 이미 있다. 앞선 요청의 응답을 못 받은 경우도 여기로 온다. */
  onAlreadyReviewed: () => void;
}

export interface ReviewSubmit {
  sending: boolean;
  sent: boolean;
  error: unknown;
  /** 보내는 중에 또 부르면 무시한다. */
  submit: (request: ReviewRequest) => Promise<void>;
}

export function useSubmitReview(
  api: ReviewApi,
  matchId: number,
  { onSent, onAlreadyReviewed }: SubmitCallbacks,
): ReviewSubmit {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const busy = useRef(false);

  const submit = async (request: ReviewRequest): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    setError(null);
    try {
      const { reviewId } = await api.create(matchId, request);
      setSent(true);
      onSent(request, reviewId);
    } catch (failure: unknown) {
      setError(failure);
      if (serverCode(failure) === "ALREADY_REVIEWED") onAlreadyReviewed();
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  return { sending, sent, error, submit };
}
