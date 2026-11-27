/** 경로의 matchId는 양의 정수만 받는다. */
export function parseMatchId(
  value: string | string[] | undefined,
): number | null {
  return typeof value === "string" && /^[1-9]\d*$/.test(value)
    ? Number(value)
    : null;
}
