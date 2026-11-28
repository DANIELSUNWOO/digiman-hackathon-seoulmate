import type { Progress } from "./types";

export interface ProgressView {
  /** 막대를 채울 비율 (0~1) */
  ratio: number;
  /** 채팅이 열리는 지점 (0~1). 필요 인증 수가 없으면 null */
  chatAt: number | null;
  /** 채팅까지 남은 곳 수. 다 채웠으면 0, 알 수 없으면 null */
  remaining: number | null;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** 필요 인증 수는 서버 값을 쓴다 (스팟 수의 50%, 내림). */
export function progressView({
  visited,
  required,
  total,
}: Progress): ProgressView {
  const ratio = total > 0 ? clamp(visited / total) : 0;
  if (required === null || required <= 0 || total <= 0)
    return { ratio, chatAt: null, remaining: null };
  return {
    ratio,
    chatAt: clamp(required / total),
    remaining: Math.max(0, required - visited),
  };
}
