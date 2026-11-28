export const reasons = [
  "ABUSIVE",
  "CONTACT_REQUEST",
  "FORCED_MEETING",
  "SEXUAL",
  "SPAM",
  "OTHER",
] as const;
export type Reason = (typeof reasons)[number];
export type TargetType = "PROFILE" | "VISIT" | "COMMENT" | "CHAT";
export type ReportTarget =
  | { type: "PROFILE"; id: null }
  | { type: Exclude<TargetType, "PROFILE">; id: number };
export type SafetyReason = { reason: Reason; detail: string | null };

export function chatTargetForSelection(
  selected: { messageId: number; senderId: string; mine: boolean },
  messages: { messageId: number; senderId: string; mine: boolean }[],
  partnerId: string,
  roomMatchId: number,
  expectedMatchId: number,
): ReportTarget | null {
  if (
    roomMatchId !== expectedMatchId ||
    selected.mine ||
    selected.senderId.toLowerCase() !== partnerId.toLowerCase() ||
    !messages.some(
      (item) =>
        item.messageId === selected.messageId &&
        !item.mine &&
        item.senderId.toLowerCase() === partnerId.toLowerCase(),
    )
  )
    return null;
  try {
    return validateTarget({ type: "CHAT", id: selected.messageId });
  } catch {
    return null;
  }
}

export function validateReason(reason: string, detail: string): SafetyReason {
  if (!reasons.includes(reason as Reason)) throw new Error("Invalid reason");
  const trimmed = detail.trim();
  if (detail.length > 1000 || (reason === "OTHER" && !trimmed))
    throw new Error("Invalid detail");
  return { reason: reason as Reason, detail: trimmed || null };
}
export function validateTarget(target: ReportTarget): ReportTarget {
  if (target.type === "PROFILE" && target.id === null) return target;
  if (
    ["VISIT", "COMMENT", "CHAT"].includes(target.type) &&
    Number.isSafeInteger(target.id) &&
    (target.id ?? 0) > 0
  )
    return target;
  throw new Error("Invalid target");
}
