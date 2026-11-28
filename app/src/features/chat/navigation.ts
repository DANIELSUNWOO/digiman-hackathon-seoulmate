/** Accept one canonical positive safe integer route parameter. */
export function parseChatRouteId(
  value: string | string[] | undefined,
): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
