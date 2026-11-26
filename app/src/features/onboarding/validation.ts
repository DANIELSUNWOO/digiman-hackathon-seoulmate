import type { GenderCode } from "../../users";

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 8;
export const BIO_MAX = 200;
export const PROFILE_IMAGE_URL_MAX = 500;
export const MIN_AGE = 18;
export const BIRTH_YEAR_MIN = 1900;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];
export type ProfileGenderChoice = GenderCode | "UNSPECIFIED" | null;

export type ProfilePayload = {
  nickname: string;
  gender: GenderCode;
  birthYear: number;
  profileImageUrl?: string;
  bio?: string;
};

export type NicknameIssue =
  "NICKNAME_REQUIRED" | "NICKNAME_TOO_SHORT" | "NICKNAME_TOO_LONG";

export type GenderIssue = "GENDER_REQUIRED" | "GENDER_UNSPECIFIED_UNSUPPORTED";

export type BirthYearIssue =
  | "BIRTH_YEAR_REQUIRED"
  | "BIRTH_YEAR_FORMAT"
  | "BIRTH_YEAR_RANGE"
  | "UNDER_AGE";

export type BioIssue = "BIO_TOO_LONG";
export type ImageUrlIssue = "PROFILE_IMAGE_URL_TOO_LONG";
export type ImageFileIssue =
  "IMAGE_EMPTY" | "FILE_TOO_LARGE" | "UNSUPPORTED_IMAGE";

export type ProfileFieldErrors = {
  nickname?: NicknameIssue;
  gender?: GenderIssue;
  birthYear?: BirthYearIssue;
  bio?: BioIssue;
  profileImageUrl?: ImageUrlIssue;
};

/**
 * Counts UTF-16 code units (`value.length`) so the live counter, TextInput `maxLength`,
 * prototype v9 `.length`, and Spring server `String.length()` use the exact same unit.
 */
export function countChars(value: string): number {
  return value.length;
}

export function validateNickname(raw: string): NicknameIssue | null {
  const trimmed = raw.trim();
  const len = countChars(trimmed);
  if (len === 0) return "NICKNAME_REQUIRED";
  if (len < NICKNAME_MIN) return "NICKNAME_TOO_SHORT";
  if (len > NICKNAME_MAX) return "NICKNAME_TOO_LONG";
  return null;
}

export function validateGender(
  gender: ProfileGenderChoice,
): GenderIssue | null {
  if (gender === null) return "GENDER_REQUIRED";
  if (gender === "UNSPECIFIED") return "GENDER_UNSPECIFIED_UNSUPPORTED";
  return null;
}

export function validateBirthYear(
  raw: string,
  currentYear: number = new Date().getFullYear(),
): BirthYearIssue | null {
  const trimmed = raw.trim();
  if (!trimmed) return "BIRTH_YEAR_REQUIRED";
  if (!/^\d{4}$/.test(trimmed)) return "BIRTH_YEAR_FORMAT";
  const year = Number(trimmed);
  if (year < BIRTH_YEAR_MIN || year > currentYear) return "BIRTH_YEAR_RANGE";
  if (currentYear - year < MIN_AGE) return "UNDER_AGE";
  return null;
}

export function validateBio(raw: string): BioIssue | null {
  const trimmed = raw.trim();
  if (countChars(trimmed) > BIO_MAX) return "BIO_TOO_LONG";
  return null;
}

export function validateProfileForm(
  input: {
    nickname: string;
    gender: ProfileGenderChoice;
    birthYear: string;
    bio: string;
    profileImageUrl?: string;
  },
  currentYear: number = new Date().getFullYear(),
):
  | { ok: true; payload: ProfilePayload }
  | { ok: false; errors: ProfileFieldErrors } {
  const errors: ProfileFieldErrors = {};
  const nicknameIssue = validateNickname(input.nickname);
  if (nicknameIssue) errors.nickname = nicknameIssue;

  const genderIssue = validateGender(input.gender);
  if (genderIssue) errors.gender = genderIssue;

  const birthYearIssue = validateBirthYear(input.birthYear, currentYear);
  if (birthYearIssue) errors.birthYear = birthYearIssue;

  const bioIssue = validateBio(input.bio);
  if (bioIssue) errors.bio = bioIssue;

  const cleanUrl = input.profileImageUrl?.trim();
  if (cleanUrl && cleanUrl.length > PROFILE_IMAGE_URL_MAX)
    errors.profileImageUrl = "PROFILE_IMAGE_URL_TOO_LONG";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const trimmedBio = input.bio.trim();
  const payload: ProfilePayload = {
    nickname: input.nickname.trim(),
    gender: input.gender as GenderCode,
    birthYear: Number(input.birthYear.trim()),
    ...(cleanUrl ? { profileImageUrl: cleanUrl } : {}),
    ...(trimmedBio ? { bio: trimmedBio } : {}),
  };
  return { ok: true, payload };
}

export function inferImageMimeType(
  mimeType?: string | null,
  fileName?: string | null,
): SupportedImageMime | null {
  const norm = mimeType?.trim().toLowerCase();
  if (norm === "image/jpg" || norm === "image/jpeg") return "image/jpeg";
  if (norm === "image/png") return "image/png";
  if (norm === "image/webp") return "image/webp";

  const ext = fileName?.trim().toLowerCase().split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

export function validateImageFile(input: {
  size: number;
  mimeType?: string | null;
  fileName?: string | null;
  maxBytes?: number;
}): { error: ImageFileIssue | null; mimeType: SupportedImageMime | null } {
  const mime = inferImageMimeType(input.mimeType, input.fileName);
  if (!mime) return { error: "UNSUPPORTED_IMAGE", mimeType: null };
  if (!Number.isFinite(input.size) || input.size <= 0)
    return { error: "IMAGE_EMPTY", mimeType: mime };
  const limit = input.maxBytes ?? MAX_IMAGE_BYTES;
  if (input.size > limit) return { error: "FILE_TOO_LARGE", mimeType: mime };
  return { error: null, mimeType: mime };
}

export function extensionForMime(mimeType: SupportedImageMime): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function buildProfilePhotoPath(
  userId: string,
  mimeType: SupportedImageMime,
  uniqueId: string,
): string {
  const safeUserId = userId.trim();
  const safeUniqueId = uniqueId.trim();
  if (
    !safeUserId ||
    !/^[A-Za-z0-9_-]+$/.test(safeUserId) ||
    !safeUniqueId ||
    !/^[A-Za-z0-9_-]+$/.test(safeUniqueId)
  ) {
    throw new Error("Invalid upload path identifier");
  }
  return `profile/${safeUserId}/${safeUniqueId}.${extensionForMime(mimeType)}`;
}
