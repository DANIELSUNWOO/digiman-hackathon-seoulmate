let owner: string | null = null;
const drafts = new Map<number, string>();
const uncertainSends = new Set<string>();
export function syncChatDraftAccount(accountId: string | null) {
  if (owner !== accountId) {
    owner = accountId;
    drafts.clear();
  }
}
export function getChatDraft(accountId: string, matchId: number) {
  return owner === accountId ? (drafts.get(matchId) ?? "") : "";
}
export function setChatDraft(
  accountId: string,
  matchId: number,
  value: string,
) {
  if (owner === accountId) drafts.set(matchId, value);
}
export function clearChatDraft(accountId: string, matchId: number) {
  if (owner === accountId) drafts.delete(matchId);
}
export function chatSendUncertain(accountId: string, matchId: number) {
  return owner === accountId && uncertainSends.has(`${accountId}:${matchId}`);
}
export function setChatSendUncertain(
  accountId: string,
  matchId: number,
  value: boolean,
) {
  if (value) uncertainSends.add(`${accountId}:${matchId}`);
  else if (owner === accountId)
    uncertainSends.delete(`${accountId}:${matchId}`);
}
