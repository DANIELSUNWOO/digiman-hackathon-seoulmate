let owner: string | null = null;
let draft: number[] | null = null;
let signature: string | null = null;
let replacingInvalidSelection = false;
export function syncTagDraftAccount(id: string | null) {
  if (id !== owner) {
    owner = id;
    draft = null;
    signature = null;
    replacingInvalidSelection = false;
  }
}
export function getTagDraft(id: string): number[] | null {
  return owner === id && draft ? [...draft] : null;
}
export function getTagDraftSignature(id: string): string | null {
  return owner === id ? signature : null;
}
export function setTagDraft(id: string, ids: number[], catalog: string) {
  if (owner === id) {
    draft = [...ids];
    signature = catalog;
  }
}
export function beginTagReselection(id: string, catalog: string) {
  if (owner === id) {
    draft = [];
    signature = catalog;
    replacingInvalidSelection = true;
  }
}
export function isTagReselection(id: string) {
  return owner === id && replacingInvalidSelection;
}
export function clearTagDraft(id: string) {
  if (owner === id) {
    draft = null;
    signature = null;
    replacingInvalidSelection = false;
  }
}
