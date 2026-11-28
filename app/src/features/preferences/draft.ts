import {
  parsePreference,
  type AgeGroup,
  type GenderPreference,
  type Preference,
} from "./model";
export type PreferenceSelection = {
  genderPref: GenderPreference | null;
  ageGroups: AgeGroup[];
};
export type PreferenceDraft = {
  original: Preference | null;
  selection: PreferenceSelection;
};
let owner: string | null = null;
let draft: PreferenceDraft | null = null;
const clone = (v: PreferenceDraft): PreferenceDraft => ({
  original: v.original ? parsePreference(v.original) : null,
  selection: {
    genderPref: v.selection.genderPref,
    ageGroups: [...v.selection.ageGroups],
  },
});
export function syncPreferenceDraftAccount(id: string | null): void {
  if (owner !== id) {
    owner = id;
    draft = null;
  }
}
export function getPreferenceDraft(id: string): PreferenceDraft | null {
  return owner === id && draft ? clone(draft) : null;
}
export function setPreferenceDraft(id: string, value: PreferenceDraft): void {
  if (owner === id) draft = clone(value);
}
export function clearPreferenceDraft(id: string): void {
  if (owner === id) draft = null;
}
