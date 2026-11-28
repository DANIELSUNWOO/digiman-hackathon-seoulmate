import type { Selection } from "./calendar";
import type { Trip } from "./model";
export type TripDraft = { original: Trip | null; selection: Selection };
let owner: string | null = null;
let draft: TripDraft | null = null;
export function syncTripDraftAccount(id: string | null): void {
  if (owner !== id) {
    owner = id;
    draft = null;
  }
}
export function getTripDraft(id: string): TripDraft | null {
  return owner === id ? draft : null;
}
export function setTripDraft(id: string, value: TripDraft): void {
  if (owner === id) draft = value;
}
export function clearTripDraft(id: string): void {
  if (owner === id) draft = null;
}
