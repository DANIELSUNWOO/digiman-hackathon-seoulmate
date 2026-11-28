import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Camera, CaretLeft, User } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  executeProfileSaveFlow,
  executeProfileUpdateFlow,
  matchesExpectedProfileUpdate,
  type ExpectedProfileUpdate,
} from "../../src/features/onboarding/api";
import {
  clearProfileDraft,
  clearUploadUncertainIfOwned,
  getProfileDraft,
  hasProfileDraft,
  markPhotoUploadedIfOwned,
  markUploadUncertainIfOwned,
  setProfileDraft,
  type LocalProfilePhoto,
  type ProfileDraft,
} from "../../src/features/onboarding/draftStore";
import {
  fieldIssueMessage,
  onboardingApiMessage,
  profileCopy,
} from "../../src/features/onboarding/messages";
import {
  nextRouteAfterProfileSave,
  parseOnboardingOrigin,
  previousOnboardingRoute,
  useOnboardingBackHandler,
  useOnboardingDismiss,
} from "../../src/features/onboarding/navigation";
import {
  pickImageAsset,
  uploadProfilePhoto,
} from "../../src/features/onboarding/photo";
import {
  BIO_MAX,
  countChars,
  NICKNAME_MAX,
  validateGender,
  type ProfileFieldErrors,
  type ProfileGenderChoice,
} from "../../src/features/onboarding/validation";
import { useSession } from "../../src/session";
import { theme } from "../../src/theme";
import {
  AppBar,
  BottomSheet,
  Button,
  ErrorNotice,
  Input,
  Label,
  ProgressTracker,
  Screen,
  ScreenFooter,
  TextLink,
} from "../../src/ui";
import { nextStep, onboardingRouteFor } from "../../src/users";

const MATE_STEPS = ["프로필", "취향", "지도"];
const TRAVELER_STEPS = ["本人確認", "基本情報", "好み", "条件", "日程"];

export default function ProfileScreen() {
  const router = useRouter();
  const dismiss = useOnboardingDismiss();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const origin = parseOnboardingOrigin(from);
  const { session, load, busy, flow } = useSession();
  const userId = session?.user.id ?? null;
  const readyMe = load.kind === "ready" ? load.me : null;
  const isEditMode = Boolean(readyMe?.onboarding.profile);
  const serverPhotoUrl = readyMe?.profileImageUrl?.trim() || null;

  const initialDraft =
    userId && hasProfileDraft(userId) ? getProfileDraft(userId) : null;
  const [nickname, setNickname] = useState(
    initialDraft?.nickname ?? readyMe?.nickname ?? "",
  );
  const [gender, setGender] = useState<ProfileGenderChoice>(
    initialDraft?.gender ?? readyMe?.gender ?? null,
  );
  const [birthYear, setBirthYear] = useState(
    initialDraft?.birthYear ??
      (readyMe?.birthYear !== undefined ? String(readyMe.birthYear) : ""),
  );
  const [bio, setBio] = useState(initialDraft?.bio ?? readyMe?.bio ?? "");
  const [localPhoto, setLocalPhoto] = useState<LocalProfilePhoto | null>(
    initialDraft?.localPhoto ?? null,
  );
  const [photoRemoved, setPhotoRemoved] = useState(
    initialDraft?.photoRemoved ?? false,
  );
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [photoError, setPhotoError] = useState("");
  const [formError, setFormError] = useState("");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const latestUserRef = useRef<string | null>(userId);
  latestUserRef.current = userId;
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const attemptRef = useRef(0);
  const submitControllerRef = useRef<AbortController | null>(null);
  const pendingExpectedRef = useRef<ExpectedProfileUpdate | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      submitControllerRef.current?.abort();
      submitControllerRef.current = null;
    };
  }, []);

  const serverInitKey = readyMe
    ? `${readyMe.onboarding.profile}:${readyMe.nickname ?? ""}:${readyMe.gender ?? ""}:${readyMe.birthYear ?? ""}:${readyMe.profileImageUrl ?? ""}:${readyMe.bio ?? ""}`
    : "loading";

  useEffect(() => {
    attemptRef.current += 1;
    submitControllerRef.current?.abort();
    submitControllerRef.current = null;
    pendingExpectedRef.current = null;
    setPhotoSheetOpen(false);
    setFieldErrors({});
    setPhotoError("");
    setFormError("");
    setRefreshFailed(false);
    submittingRef.current = false;
    setSubmitting(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNickname("");
      setGender(null);
      setBirthYear("");
      setBio("");
      setLocalPhoto(null);
      setPhotoRemoved(false);
      return;
    }
    if (hasProfileDraft(userId)) {
      const draft = getProfileDraft(userId);
      setNickname(draft.nickname);
      setGender(draft.gender);
      setBirthYear(draft.birthYear);
      setBio(draft.bio);
      setLocalPhoto(draft.localPhoto);
      setPhotoRemoved(Boolean(draft.photoRemoved));
      return;
    }
    if (submittingRef.current) return;
    if (readyMe?.onboarding.profile) {
      setNickname(readyMe.nickname ?? "");
      setGender(readyMe.gender ?? null);
      setBirthYear(
        readyMe.birthYear !== undefined ? String(readyMe.birthYear) : "",
      );
      setBio(readyMe.bio ?? "");
      setLocalPhoto(null);
      setPhotoRemoved(false);
      return;
    }
    setNickname("");
    setGender(null);
    setBirthYear("");
    setBio("");
    setLocalPhoto(null);
    setPhotoRemoved(false);
  }, [userId, serverInitKey]);

  function invalidatePendingRefresh() {
    pendingExpectedRef.current = null;
    setRefreshFailed(false);
  }

  function handleCancelSubmit() {
    attemptRef.current += 1;
    submitControllerRef.current?.abort();
    submitControllerRef.current = null;
    submittingRef.current = false;
    setSubmitting(false);
  }

  function handleBack() {
    if (photoSheetOpen) {
      setPhotoSheetOpen(false);
      return;
    }
    if (submitting) handleCancelSubmit();
    const role = readyMe?.role ?? "TRAVELER";
    dismiss(previousOnboardingRoute(role, "profile", origin));
  }

  useOnboardingBackHandler(() => {
    handleBack();
    return true;
  });

  if (!session || load.kind !== "ready") return null;

  if (!load.me.onboarding.verified) {
    return <Redirect href={onboardingRouteFor("verification")} />;
  }
  if (load.me.onboarding.profile && !origin) {
    return <Redirect href={onboardingRouteFor(nextStep(load.me))} />;
  }

  const ko = load.me.language === "ko";
  const isMate = load.me.role === "MATE";
  const language = ko ? "ko" : "ja";
  const copy = profileCopy(ko, isMate);
  const locked = busy || submitting;
  const bodyFont = ko ? "NotoSansKR_400Regular" : "NotoSansJP_400Regular";
  const mediumFont = ko ? "NotoSansKR_500Medium" : "NotoSansJP_500Medium";
  const boldFont = ko ? "NotoSansKR_700Bold" : "NotoSansJP_700Bold";
  const displayedPhotoUri = localPhoto
    ? localPhoto.uri
    : !photoRemoved && serverPhotoUrl
      ? serverPhotoUrl
      : null;

  function isSameContext(expectedUserId: string) {
    return mountedRef.current && latestUserRef.current === expectedUserId;
  }

  function persistDraft(patch: Partial<ProfileDraft>) {
    if (!session) return;
    setProfileDraft(session.user.id, {
      nickname,
      gender,
      birthYear,
      bio,
      localPhoto,
      photoRemoved,
      ...patch,
    });
  }

  function updateNickname(value: string) {
    setNickname(value);
    persistDraft({ nickname: value });
    invalidatePendingRefresh();
    setFieldErrors((prev) => ({ ...prev, nickname: undefined }));
    setFormError("");
  }

  function updateGender(value: Exclude<ProfileGenderChoice, null>) {
    if (isEditMode) return;
    setGender(value);
    persistDraft({ gender: value });
    invalidatePendingRefresh();
    const issue = validateGender(value) ?? undefined;
    setFieldErrors((prev) => ({ ...prev, gender: issue }));
    setFormError("");
  }

  function updateBirthYear(value: string) {
    if (isEditMode) return;
    setBirthYear(value);
    persistDraft({ birthYear: value });
    invalidatePendingRefresh();
    setFieldErrors((prev) => ({ ...prev, birthYear: undefined }));
    setFormError("");
  }

  function updateBio(value: string) {
    setBio(value);
    persistDraft({ bio: value });
    invalidatePendingRefresh();
    setFieldErrors((prev) => ({ ...prev, bio: undefined }));
    setFormError("");
  }

  async function handlePickPhoto(source: "library" | "camera") {
    if (locked || !session) return;
    setPhotoSheetOpen(false);
    const activeId = session.user.id;
    setPhotoError("");
    setFormError("");
    try {
      const picked = await pickImageAsset(source, { square: true });
      if (!isSameContext(activeId) || !picked) return;
      invalidatePendingRefresh();
      setLocalPhoto(picked);
      setPhotoRemoved(false);
      setProfileDraft(activeId, {
        nickname,
        gender,
        birthYear,
        bio,
        localPhoto: picked,
        uploadedPhoto: null,
        uncertainUploadLocalKey: null,
        photoRemoved: false,
      });
    } catch (error) {
      if (!isSameContext(activeId)) return;
      setPhotoError(onboardingApiMessage(error, ko));
    }
  }

  function handleRemovePhoto() {
    if (locked || !session) return;
    setPhotoSheetOpen(false);
    invalidatePendingRefresh();
    setLocalPhoto(null);
    setPhotoRemoved(true);
    setPhotoError("");
    setFormError("");
    setProfileDraft(session.user.id, {
      nickname,
      gender,
      birthYear,
      bio,
      localPhoto: null,
      uploadedPhoto: null,
      uncertainUploadLocalKey: null,
      photoRemoved: true,
    });
  }

  async function handleSubmit() {
    if (locked || submittingRef.current || !flow || !session) return;
    const activeId = session.user.id;
    const token = session.access_token;
    const currentDraft = getProfileDraft(activeId);
    const attemptId = ++attemptRef.current;
    const controller = new AbortController();
    submitControllerRef.current = controller;

    pendingExpectedRef.current = null;
    submittingRef.current = true;
    setSubmitting(true);
    setFieldErrors({});
    setPhotoError("");
    setFormError("");
    setRefreshFailed(false);

    const isAttemptActive = () =>
      isSameContext(activeId) &&
      attemptRef.current === attemptId &&
      !controller.signal.aborted;

    const uploadHandlers = {
      uploadPhoto: (
        photo: LocalProfilePhoto,
        options?: {
          signal?: AbortSignal;
          allowExistingOnUncertainRetry?: boolean;
        },
      ) =>
        uploadProfilePhoto({
          userId: activeId,
          accessToken: token,
          photo,
          signal: options?.signal,
          allowExistingOnUncertainRetry: options?.allowExistingOnUncertainRetry,
        }),
      onPhotoUploaded: (uploaded: { localKey: string; publicUrl: string }) => {
        if (isAttemptActive()) {
          markPhotoUploadedIfOwned(activeId, uploaded);
        }
      },
      onUploadUncertain: (localKey: string) => {
        if (isAttemptActive()) {
          markUploadUncertainIfOwned(activeId, localKey);
        }
      },
      onUploadUncertainCleared: (localKey: string) => {
        if (isAttemptActive()) {
          clearUploadUncertainIfOwned(activeId, localKey);
        }
      },
      refreshMember: () => flow.refreshMember(),
      getMe: () => {
        const snap = flow.snapshot();
        return snap.load.kind === "ready" ? snap.load.me : null;
      },
      clearDraft: () => {
        if (isAttemptActive()) {
          clearProfileDraft(activeId);
        }
      },
      isCurrentAccount: isAttemptActive,
      signal: controller.signal,
    };

    try {
      if (isEditMode) {
        const result = await executeProfileUpdateFlow({
          token,
          userId: activeId,
          apiConfigured: !!process.env.EXPO_PUBLIC_API_BASE_URL,
          input: {
            nickname,
            bio,
            serverPhotoUrl,
            photoRemoved,
            localPhoto,
            uploadedPhoto: currentDraft.uploadedPhoto,
            uncertainUploadLocalKey: currentDraft.uncertainUploadLocalKey,
          },
          ...uploadHandlers,
        });

        if (!isAttemptActive()) return;

        if (result.kind === "invalid") {
          setFieldErrors(result.errors);
          return;
        }
        if (result.kind === "saved") {
          pendingExpectedRef.current = null;
          const updated = flow.snapshot().load;
          const target =
            updated.kind === "ready"
              ? nextRouteAfterProfileSave(updated.me, origin)
              : "/account";
          if (target === "/account") dismiss(target);
          else router.replace(target);
          return;
        }
        if (result.kind === "refresh_failed") {
          pendingExpectedRef.current = result.expected;
          setRefreshFailed(true);
          setFormError(copy.editRefreshFailed);
        }
        return;
      }

      const result = await executeProfileSaveFlow({
        token,
        userId: activeId,
        apiConfigured: !!process.env.EXPO_PUBLIC_API_BASE_URL,
        input: {
          nickname,
          gender,
          birthYear,
          bio,
          localPhoto,
          uploadedPhoto: currentDraft.uploadedPhoto,
          uncertainUploadLocalKey: currentDraft.uncertainUploadLocalKey,
        },
        ...uploadHandlers,
      });

      if (!isAttemptActive()) return;

      if (result.kind === "invalid") {
        setFieldErrors(result.errors);
        return;
      }

      if (result.kind === "saved") {
        const updated = flow.snapshot().load;
        const target =
          updated.kind === "ready"
            ? nextRouteAfterProfileSave(updated.me, origin)
            : "/account";
        if (target === "/account") dismiss(target);
        else router.replace(target);
        return;
      }

      if (result.kind === "refresh_failed") {
        setRefreshFailed(true);
        setFormError(copy.refreshFailed);
      }
    } catch (error) {
      if (!isAttemptActive()) return;
      setFormError(onboardingApiMessage(error, ko));
    } finally {
      if (submitControllerRef.current === controller) {
        submitControllerRef.current = null;
      }
      if (mountedRef.current && attemptRef.current === attemptId) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  }

  async function handleRetryRefresh() {
    if (locked || submittingRef.current || !flow || !session) return;
    const activeId = session.user.id;
    const attemptId = ++attemptRef.current;
    const expected = pendingExpectedRef.current;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError("");
    try {
      await flow.refreshMember();
      if (!isSameContext(activeId) || attemptRef.current !== attemptId) return;
      const snap = flow.snapshot();
      if (snap.load.kind === "ready") {
        if (isEditMode) {
          if (
            expected !== null &&
            pendingExpectedRef.current === expected &&
            matchesExpectedProfileUpdate(snap.load.me, expected)
          ) {
            pendingExpectedRef.current = null;
            clearProfileDraft(activeId);
            setRefreshFailed(false);
            const target = nextRouteAfterProfileSave(snap.load.me, origin);
            if (target === "/account") dismiss(target);
            else router.replace(target);
            return;
          }
        } else {
          const next = nextStep(snap.load.me);
          if (next !== "profile") {
            clearProfileDraft(activeId);
            setRefreshFailed(false);
            const target = nextRouteAfterProfileSave(snap.load.me, origin);
            if (target === "/account") dismiss(target);
            else router.replace(target);
            return;
          }
        }
      }
      setRefreshFailed(true);
      setFormError(isEditMode ? copy.editRefreshFailed : copy.refreshFailed);
    } catch (error) {
      if (!isSameContext(activeId) || attemptRef.current !== attemptId) return;
      setRefreshFailed(true);
      setFormError(onboardingApiMessage(error, ko));
    } finally {
      if (mountedRef.current && attemptRef.current === attemptId) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  }

  const genderOptions: Array<{
    key: Exclude<ProfileGenderChoice, null>;
    label: string;
  }> = [
    { key: "FEMALE", label: copy.genderFemale },
    { key: "MALE", label: copy.genderMale },
    ...(isEditMode
      ? []
      : [{ key: "UNSPECIFIED" as const, label: copy.genderUnspecified }]),
  ];

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.body}>
        {origin === "account" ? (
          <AppBar
            title={copy.editHeaderTitle}
            language={language}
            backLabel={copy.backLabel}
            backDisabled={busy}
            onBack={handleBack}
          />
        ) : (
          <View style={styles.onboardingTop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.backLabel}
              disabled={busy}
              onPress={handleBack}
              style={styles.backButton}
            >
              <CaretLeft
                size={theme.size.icon}
                color={theme.color.labelNormal}
              />
            </Pressable>
            <ProgressTracker
              steps={isMate ? MATE_STEPS : TRAVELER_STEPS}
              currentIndex={isMate ? 0 : 1}
              language={language}
            />
          </View>
        )}

        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.changePhotoLabel}
              disabled={locked}
              onPress={() => setPhotoSheetOpen(true)}
              style={styles.avatarPreviewButton}
            >
              {displayedPhotoUri ? (
                <Image
                  source={{ uri: displayedPhotoUri }}
                  style={styles.avatarImage}
                  accessibilityLabel={copy.photoSelectedHint}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={36} color={theme.color.brandDeep} />
                </View>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.changePhotoLabel}
              disabled={locked}
              hitSlop={6}
              onPress={() => setPhotoSheetOpen(true)}
              style={styles.avatarEditBadge}
            >
              <Camera
                size={theme.size.iconInline}
                color={theme.color.surface}
                weight="fill"
              />
            </Pressable>
          </View>

          {!!photoError && (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.inlineErrorText, { fontFamily: mediumFont }]}
            >
              {photoError}
            </Text>
          )}
        </View>

        <View style={styles.fieldsWrap}>
          <View style={styles.fieldGroup}>
            <Label language={language} variant="label" tone="neutral">
              {copy.nicknameLabel}
            </Label>
            <Input
              language={language}
              accessibilityLabel={copy.nicknameLabel}
              placeholder={copy.nicknamePlaceholder}
              value={nickname}
              onChangeText={updateNickname}
              maxLength={NICKNAME_MAX}
              editable={!locked}
              error={!!fieldErrors.nickname}
            />
            <View style={styles.counterRow}>
              {fieldErrors.nickname ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.inlineErrorText,
                    { fontFamily: mediumFont, flex: 1 },
                  ]}
                >
                  {fieldIssueMessage(fieldErrors.nickname, ko)}
                </Text>
              ) : (
                <Text
                  style={[styles.hintText, { fontFamily: bodyFont, flex: 1 }]}
                >
                  {copy.nicknameHint}
                </Text>
              )}
              <Text style={[styles.counterText, { fontFamily: bodyFont }]}>
                {countChars(nickname)} / {NICKNAME_MAX}
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Label language={language} variant="label" tone="neutral">
              {copy.genderLabel}
            </Label>
            <View
              style={[
                styles.segmentTrack,
                isEditMode && styles.segmentTrackReadonly,
              ]}
            >
              {genderOptions.map((option) => {
                const selected = gender === option.key;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                      disabled: locked || isEditMode,
                    }}
                    disabled={locked || isEditMode}
                    onPress={() => updateGender(option.key)}
                    style={[
                      styles.segmentButton,
                      selected && styles.segmentButtonSelected,
                      isEditMode && !selected && styles.segmentButtonMuted,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.segmentLabel,
                        { fontFamily: selected ? boldFont : bodyFont },
                        selected && styles.segmentLabelSelected,
                        isEditMode && !selected && styles.segmentLabelMuted,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {fieldErrors.gender ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.inlineErrorText, { fontFamily: mediumFont }]}
              >
                {fieldIssueMessage(fieldErrors.gender, ko)}
              </Text>
            ) : isEditMode ? (
              <Text style={[styles.hintText, { fontFamily: bodyFont }]}>
                {copy.genderReadonlyHint}
              </Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Label language={language} variant="label" tone="neutral">
              {copy.birthYearLabel}
            </Label>
            <Input
              language={language}
              accessibilityLabel={copy.birthYearLabel}
              placeholder={copy.birthYearPlaceholder}
              value={birthYear}
              onChangeText={updateBirthYear}
              keyboardType="number-pad"
              maxLength={4}
              editable={!locked && !isEditMode}
              error={!!fieldErrors.birthYear}
            />
            {fieldErrors.birthYear ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.inlineErrorText, { fontFamily: mediumFont }]}
              >
                {fieldIssueMessage(fieldErrors.birthYear, ko)}
              </Text>
            ) : (
              <Text style={[styles.hintText, { fontFamily: bodyFont }]}>
                {isEditMode ? copy.birthYearReadonlyHint : copy.birthYearHint}
              </Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Label language={language} variant="label" tone="neutral">
              {copy.bioLabel}
            </Label>
            <Input
              language={language}
              accessibilityLabel={copy.bioLabel}
              placeholder={copy.bioPlaceholder}
              value={bio}
              onChangeText={updateBio}
              multiline
              maxLength={BIO_MAX}
              editable={!locked}
              error={!!fieldErrors.bio}
              style={styles.bioInput}
            />
            <View style={styles.counterRow}>
              {fieldErrors.bio ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.inlineErrorText,
                    { fontFamily: mediumFont, flex: 1 },
                  ]}
                >
                  {fieldIssueMessage(fieldErrors.bio, ko)}
                </Text>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              <Text style={[styles.counterText, { fontFamily: bodyFont }]}>
                {countChars(bio)} / {BIO_MAX}
              </Text>
            </View>
          </View>
        </View>

        {!!formError && (
          <ErrorNotice language={language}>{formError}</ErrorNotice>
        )}

        <ScreenFooter style={styles.footerOverride}>
          {submitting && (
            <View style={styles.cancelRow}>
              <TextLink
                variant="quiet"
                language={language}
                label={copy.cancelButton}
                onPress={handleCancelSubmit}
              />
            </View>
          )}
          {refreshFailed ? (
            <Button
              language={language}
              loading={submitting}
              disabled={locked}
              label={locked ? copy.savingButton : copy.retryRefresh}
              onPress={() => void handleRetryRefresh()}
            />
          ) : (
            <Button
              language={language}
              loading={submitting}
              disabled={locked}
              label={
                locked
                  ? copy.savingButton
                  : origin === "account"
                    ? copy.saveButton
                    : copy.nextButton
              }
              onPress={() => void handleSubmit()}
            />
          )}
        </ScreenFooter>
      </View>

      <BottomSheet
        visible={photoSheetOpen}
        onClose={() => setPhotoSheetOpen(false)}
      >
        <View style={styles.photoSheetContent}>
          <Label variant="sheetTitle" center language={language}>
            {copy.photoSheetTitle}
          </Label>
          <Button
            secondary
            language={language}
            disabled={locked}
            label={copy.pickPhoto}
            onPress={() => void handlePickPhoto("library")}
          />
          <Button
            secondary
            language={language}
            disabled={locked}
            label={copy.takePhoto}
            onPress={() => void handlePickPhoto("camera")}
          />
          {displayedPhotoUri ? (
            <Pressable
              accessibilityRole="button"
              disabled={locked}
              onPress={handleRemovePhoto}
              style={styles.sheetDangerAction}
            >
              <Text
                style={[styles.sheetDangerText, { fontFamily: mediumFont }]}
              >
                {copy.removePhoto}
              </Text>
            </Pressable>
          ) : null}
          <TextLink
            variant="quiet"
            language={language}
            label={copy.photoSheetClose}
            onPress={() => setPhotoSheetOpen(false)}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 0,
  },
  body: {
    flexGrow: 1,
    gap: theme.space.lg,
  },
  onboardingTop: {
    gap: theme.space.xs,
  },
  backButton: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  avatarSection: {
    alignItems: "center",
    gap: theme.space.sm,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    marginTop: 6,
    marginBottom: 4,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPreviewButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.color.brandTint,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.color.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.color.brand,
    borderWidth: 3,
    borderColor: theme.color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  photoSheetContent: {
    gap: theme.space.sm,
  },
  sheetDangerAction: {
    minHeight: theme.size.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDangerText: {
    fontSize: theme.typography.desc.fontSize,
    color: theme.color.dangerPress,
  },
  fieldsWrap: {
    gap: theme.space.xl,
  },
  fieldGroup: {
    gap: theme.space.sm,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space.sm,
  },
  hintText: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.labelDesc,
  },
  counterText: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.labelDesc,
  },
  segmentTrack: {
    flexDirection: "row",
    backgroundColor: theme.color.fillNormal,
    borderRadius: theme.radius.button,
    padding: 3,
    gap: 3,
  },
  segmentTrackReadonly: {
    opacity: 0.78,
  },
  segmentButton: {
    flex: 1,
    minHeight: theme.size.touchMin,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space.xs,
  },
  segmentButtonSelected: {
    backgroundColor: theme.color.surface,
    ...theme.shadow.card,
  },
  segmentButtonMuted: {
    opacity: 0.55,
  },
  segmentLabel: {
    fontSize: theme.typography.desc.fontSize,
    color: theme.color.labelAlt,
    textAlign: "center",
  },
  segmentLabelSelected: {
    color: theme.color.labelNormal,
  },
  segmentLabelMuted: {
    color: theme.color.labelAssist,
  },
  bioInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  inlineErrorText: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.dangerPress,
  },
  cancelRow: {
    alignItems: "center",
  },
  footerOverride: {
    paddingTop: theme.space.md,
  },
});
