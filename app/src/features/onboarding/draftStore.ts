import type { ProfileGenderChoice, SupportedImageMime } from "./validation";

export type LocalProfilePhoto = {
  uri: string;
  mimeType: SupportedImageMime;
  size: number;
  bytes: ArrayBuffer;
  localKey: string;
};

export type UploadedProfilePhoto = {
  localKey: string;
  publicUrl: string;
};

export type ProfileDraft = {
  nickname: string;
  gender: ProfileGenderChoice;
  birthYear: string;
  bio: string;
  localPhoto: LocalProfilePhoto | null;
  uploadedPhoto: UploadedProfilePhoto | null;
  uncertainUploadLocalKey: string | null;
  photoRemoved?: boolean;
};

const EMPTY_DRAFT: ProfileDraft = {
  nickname: "",
  gender: null,
  birthYear: "",
  bio: "",
  localPhoto: null,
  uploadedPhoto: null,
  uncertainUploadLocalKey: null,
  photoRemoved: false,
};

// Keep profile drafts strictly in memory per account; never persist raw images across sign-outs.
const drafts = new Map<string, ProfileDraft>();
let activeAccountId: string | null = null;

export function hasProfileDraft(userId: string): boolean {
  return drafts.has(userId);
}

export function getProfileDraft(userId: string): ProfileDraft {
  const existing = drafts.get(userId);
  if (!existing) return { ...EMPTY_DRAFT };
  return { ...existing };
}

export function setProfileDraft(
  userId: string,
  patch: Partial<ProfileDraft>,
): ProfileDraft {
  const current = getProfileDraft(userId);
  const next: ProfileDraft = { ...current, ...patch };
  drafts.set(userId, next);
  return next;
}

export function markUploadUncertainIfOwned(
  userId: string,
  localKey: string,
): boolean {
  if (activeAccountId !== userId) return false;
  const existing = drafts.get(userId);
  if (!existing || existing.localPhoto?.localKey !== localKey) return false;
  drafts.set(userId, { ...existing, uncertainUploadLocalKey: localKey });
  return true;
}

export function clearUploadUncertainIfOwned(
  userId: string,
  localKey: string,
): boolean {
  if (activeAccountId !== userId) return false;
  const existing = drafts.get(userId);
  if (!existing || existing.uncertainUploadLocalKey !== localKey) return false;
  drafts.set(userId, { ...existing, uncertainUploadLocalKey: null });
  return true;
}

export function markPhotoUploadedIfOwned(
  userId: string,
  uploaded: UploadedProfilePhoto,
): boolean {
  if (activeAccountId !== userId) return false;
  const existing = drafts.get(userId);
  if (!existing || existing.localPhoto?.localKey !== uploaded.localKey) {
    return false;
  }
  drafts.set(userId, {
    ...existing,
    uploadedPhoto: uploaded,
    uncertainUploadLocalKey: null,
  });
  return true;
}

export function clearProfileDraft(userId: string): void {
  drafts.delete(userId);
}

export function syncDraftAccount(activeUserId: string | null): void {
  activeAccountId = activeUserId;
  if (!activeUserId) {
    drafts.clear();
    return;
  }
  for (const key of drafts.keys()) {
    if (key !== activeUserId) drafts.delete(key);
  }
}
