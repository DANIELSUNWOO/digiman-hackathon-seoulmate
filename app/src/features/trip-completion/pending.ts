export type EditSnapshot = {
  albumId: number;
  title: string;
  coverUrl: string | null;
};
type Phase = "pending" | "uncertain";
const pending = new Map<string, { phase: Phase; edit?: EditSnapshot }>();
export const completionKey = (account: string, matchId: number) =>
  JSON.stringify([account, matchId]);
export const completionPhase = (key: string): Phase | null =>
  pending.get(key)?.phase ?? null;
export const pendingEdit = (key: string): EditSnapshot | null =>
  pending.get(key)?.edit ?? null;
export function beginCompletion(key: string, edit?: EditSnapshot): boolean {
  if (pending.has(key)) return false;
  pending.set(key, { phase: "pending", edit });
  return true;
}
export function beginCompletionRetry(key: string): boolean {
  const value = pending.get(key);
  if (!value || value.phase !== "uncertain" || value.edit) return false;
  pending.set(key, { phase: "pending" });
  return true;
}
export function beginEditRetry(key: string, expected: EditSnapshot): boolean {
  const value = pending.get(key);
  const edit = value?.edit;
  if (
    value?.phase !== "uncertain" ||
    !edit ||
    edit.albumId !== expected.albumId ||
    edit.title !== expected.title ||
    edit.coverUrl !== expected.coverUrl
  )
    return false;
  pending.set(key, { phase: "pending", edit });
  return true;
}
export function completionSettled(key: string): void {
  const value = pending.get(key);
  if (value?.phase === "pending")
    pending.set(key, { ...value, phase: "uncertain" });
}
export function completionConfirmed(key: string): void {
  pending.delete(key);
}
export function editMatches(key: string, album: EditSnapshot): boolean {
  const wanted = pendingEdit(key);
  return (
    !!wanted &&
    wanted.albumId === album.albumId &&
    wanted.title === album.title &&
    wanted.coverUrl === album.coverUrl
  );
}

export function canResolveCompletion(
  phase: Phase | null,
  status: string,
  albumConfirmed: boolean,
): boolean {
  return (
    phase !== "pending" &&
    albumConfirmed &&
    (status === "COMPLETED" || status === "EXPIRED")
  );
}
