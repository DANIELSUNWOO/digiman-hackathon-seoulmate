import { Redirect, useRouter } from "expo-router";
import { Camera, CaretLeft, User } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { executeProfileSaveFlow } from "../../src/features/onboarding/api";
import {
  clearProfileDraft,
  clearUploadUncertainIfOwned,
  getProfileDraft,
  markPhotoUploadedIfOwned,
  markUploadUncertainIfOwned,
  setProfileDraft,
  type LocalProfilePhoto,
} from "../../src/features/onboarding/draftStore";
import {
  fieldIssueMessage,
  onboardingApiMessage,
  profileCopy,
} from "../../src/features/onboarding/messages";
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
import { Button, Input, Label, Screen } from "../../src/ui";
import { nextStep, onboardingRouteFor } from "../../src/users";

export default function ProfileScreen() {
  const router = useRouter();
  const { session, load, busy, flow } = useSession();
  const userId = session?.user.id ?? null;

  const initialDraft = userId ? getProfileDraft(userId) : null;
  const [nickname, setNickname] = useState(initialDraft?.nickname ?? "");
  const [gender, setGender] = useState<ProfileGenderChoice>(
    initialDraft?.gender ?? null,
  );
  const [birthYear, setBirthYear] = useState(initialDraft?.birthYear ?? "");
  const [bio, setBio] = useState(initialDraft?.bio ?? "");
  const [localPhoto, setLocalPhoto] = useState<LocalProfilePhoto | null>(
    initialDraft?.localPhoto ?? null,
  );

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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      submitControllerRef.current?.abort();
      submitControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    attemptRef.current += 1;
    submitControllerRef.current?.abort();
    submitControllerRef.current = null;
    if (!userId) return;
    const draft = getProfileDraft(userId);
    setNickname(draft.nickname);
    setGender(draft.gender);
    setBirthYear(draft.birthYear);
    setBio(draft.bio);
    setLocalPhoto(draft.localPhoto);
    setFieldErrors({});
    setPhotoError("");
    setFormError("");
    setRefreshFailed(false);
    submittingRef.current = false;
    setSubmitting(false);
  }, [userId]);

  if (!session || load.kind !== "ready") return null;

  const step = nextStep(load.me);
  if (step !== "profile") {
    return <Redirect href={onboardingRouteFor(step)} />;
  }

  const ko = load.me.language === "ko";
  const isMate = load.me.role === "MATE";
  const language = ko ? "ko" : "ja";
  const copy = profileCopy(ko, isMate);
  const locked = busy || submitting;
  const bodyFont = ko ? "NotoSansKR_400Regular" : "NotoSansJP_400Regular";
  const mediumFont = ko ? "NotoSansKR_500Medium" : "NotoSansJP_500Medium";
  const boldFont = ko ? "NotoSansKR_700Bold" : "NotoSansJP_700Bold";

  function isSameContext(expectedUserId: string) {
    return mountedRef.current && latestUserRef.current === expectedUserId;
  }

  function handleCancelSubmit() {
    submitControllerRef.current?.abort();
    submitControllerRef.current = null;
    submittingRef.current = false;
    setSubmitting(false);
  }

  function handleBack() {
    if (submitting) handleCancelSubmit();
    if (router.canGoBack()) router.back();
    else router.replace("/account");
  }

  function updateNickname(value: string) {
    setNickname(value);
    setProfileDraft(session!.user.id, { nickname: value });
    setFieldErrors((prev) => ({ ...prev, nickname: undefined }));
    setFormError("");
  }

  function updateGender(value: Exclude<ProfileGenderChoice, null>) {
    setGender(value);
    setProfileDraft(session!.user.id, { gender: value });
    const issue = validateGender(value) ?? undefined;
    setFieldErrors((prev) => ({ ...prev, gender: issue }));
    setFormError("");
  }

  function updateBirthYear(value: string) {
    setBirthYear(value);
    setProfileDraft(session!.user.id, { birthYear: value });
    setFieldErrors((prev) => ({ ...prev, birthYear: undefined }));
    setFormError("");
  }

  function updateBio(value: string) {
    setBio(value);
    setProfileDraft(session!.user.id, { bio: value });
    setFieldErrors((prev) => ({ ...prev, bio: undefined }));
    setFormError("");
  }

  async function handlePickPhoto(source: "library" | "camera") {
    if (locked || !session) return;
    const activeId = session.user.id;
    setPhotoError("");
    setFormError("");
    setRefreshFailed(false);
    try {
      const picked = await pickImageAsset(source, { square: true });
      if (!isSameContext(activeId) || !picked) return;
      setLocalPhoto(picked);
      setProfileDraft(activeId, {
        localPhoto: picked,
        uploadedPhoto: null,
        uncertainUploadLocalKey: null,
      });
    } catch (error) {
      if (!isSameContext(activeId)) return;
      setPhotoError(onboardingApiMessage(error, ko));
    }
  }

  function handleRemovePhoto() {
    if (locked || !session) return;
    setLocalPhoto(null);
    setPhotoError("");
    setFormError("");
    setProfileDraft(session.user.id, {
      localPhoto: null,
      uploadedPhoto: null,
      uncertainUploadLocalKey: null,
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

    submittingRef.current = true;
    setSubmitting(true);
    setFieldErrors({});
    setPhotoError("");
    setFormError("");
    setRefreshFailed(false);

    try {
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
        uploadPhoto: (photo, options) =>
          uploadProfilePhoto({
            userId: activeId,
            accessToken: token,
            photo,
            signal: options?.signal,
            allowExistingOnUncertainRetry:
              options?.allowExistingOnUncertainRetry,
          }),
        onPhotoUploaded: (uploaded) => {
          if (attemptRef.current === attemptId) {
            markPhotoUploadedIfOwned(activeId, uploaded);
          }
        },
        onUploadUncertain: (localKey) => {
          if (attemptRef.current === attemptId) {
            markUploadUncertainIfOwned(activeId, localKey);
          }
        },
        onUploadUncertainCleared: (localKey) => {
          if (attemptRef.current === attemptId) {
            clearUploadUncertainIfOwned(activeId, localKey);
          }
        },
        refreshMember: () => flow.refreshMember(),
        getMe: () => {
          const snap = flow.snapshot();
          return snap.load.kind === "ready" ? snap.load.me : null;
        },
        clearDraft: () => clearProfileDraft(activeId),
        isCurrentAccount: () => isSameContext(activeId),
        signal: controller.signal,
      });

      if (!isSameContext(activeId) || attemptRef.current !== attemptId) return;

      if (result.kind === "invalid") {
        setFieldErrors(result.errors);
        return;
      }

      if (result.kind === "saved") {
        const updated = flow.snapshot().load;
        const target =
          updated.kind === "ready"
            ? onboardingRouteFor(nextStep(updated.me))
            : "/account";
        router.replace(target);
        return;
      }

      if (result.kind === "refresh_failed") {
        setRefreshFailed(true);
        setFormError(copy.refreshFailed);
      }
    } catch (error) {
      if (!isSameContext(activeId) || attemptRef.current !== attemptId) return;
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
    submittingRef.current = true;
    setSubmitting(true);
    setFormError("");
    try {
      await flow.refreshMember();
      if (!isSameContext(activeId) || attemptRef.current !== attemptId) return;
      const snap = flow.snapshot();
      if (snap.load.kind === "ready") {
        const next = nextStep(snap.load.me);
        if (next !== "profile") {
          clearProfileDraft(activeId);
          setRefreshFailed(false);
          router.replace(onboardingRouteFor(next));
          return;
        }
      }
      setRefreshFailed(true);
      setFormError(copy.refreshFailed);
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
    { key: "UNSPECIFIED", label: copy.genderUnspecified },
  ];

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.backLabel}
            disabled={busy}
            onPress={handleBack}
            style={styles.backButton}
          >
            <CaretLeft size={theme.size.icon} color={theme.color.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { fontFamily: boldFont }]}>
            {copy.headerTitle}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {localPhoto ? (
              <Image
                source={{ uri: localPhoto.uri }}
                style={styles.avatarImage}
                accessibilityLabel={copy.photoSelectedHint}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={34} color={theme.color.muted} />
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.changePhotoLabel}
              disabled={locked}
              onPress={() => void handlePickPhoto("library")}
              style={styles.avatarEditBadge}
            >
              <Camera
                size={theme.size.iconInline}
                color={theme.color.text}
                weight="fill"
              />
            </Pressable>
          </View>

          <View style={styles.photoActionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={locked}
              onPress={() => void handlePickPhoto("library")}
              style={styles.photoTextButton}
            >
              <Text
                style={[styles.photoActionLabel, { fontFamily: mediumFont }]}
              >
                {copy.pickPhoto}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={locked}
              onPress={() => void handlePickPhoto("camera")}
              style={styles.photoTextButton}
            >
              <Text
                style={[styles.photoActionLabel, { fontFamily: mediumFont }]}
              >
                {copy.takePhoto}
              </Text>
            </Pressable>
            {localPhoto && (
              <Pressable
                accessibilityRole="button"
                disabled={locked}
                onPress={handleRemovePhoto}
                style={styles.photoTextButton}
              >
                <Text
                  style={[
                    styles.photoActionLabel,
                    { fontFamily: mediumFont, color: theme.color.dangerInk },
                  ]}
                >
                  {copy.removePhoto}
                </Text>
              </Pressable>
            )}
          </View>
          <Text style={[styles.hintText, { fontFamily: bodyFont }]}>
            {localPhoto ? copy.photoSelectedHint : copy.photoOptionalHint}
          </Text>
          {!!photoError && (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.errorText, { fontFamily: bodyFont }]}
            >
              {photoError}
            </Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Label language={language} weight="bold">
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
          />
          <View style={styles.counterRow}>
            <Text style={[styles.hintText, { fontFamily: bodyFont, flex: 1 }]}>
              {copy.nicknameHint}
            </Text>
            <Text style={[styles.counterText, { fontFamily: boldFont }]}>
              {countChars(nickname)} / {NICKNAME_MAX}
            </Text>
          </View>
          {fieldErrors.nickname && (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.errorText, { fontFamily: bodyFont }]}
            >
              {fieldIssueMessage(fieldErrors.nickname, ko)}
            </Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Label language={language} weight="bold">
            {copy.genderLabel}
          </Label>
          <View style={styles.segmentTrack}>
            {genderOptions.map((option) => {
              const selected = gender === option.key;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: locked }}
                  disabled={locked}
                  onPress={() => updateGender(option.key)}
                  style={[
                    styles.segmentButton,
                    selected && styles.segmentButtonSelected,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.segmentLabel,
                      { fontFamily: selected ? boldFont : bodyFont },
                      selected && { color: theme.color.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.gender && (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.errorText, { fontFamily: bodyFont }]}
            >
              {fieldIssueMessage(fieldErrors.gender, ko)}
            </Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Label language={language} weight="bold">
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
            editable={!locked}
          />
          <Text style={[styles.hintText, { fontFamily: bodyFont }]}>
            {copy.birthYearHint}
          </Text>
          {fieldErrors.birthYear && (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.errorText, { fontFamily: bodyFont }]}
            >
              {fieldIssueMessage(fieldErrors.birthYear, ko)}
            </Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Label language={language} weight="bold">
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
            style={styles.bioInput}
          />
          <View style={styles.counterRow}>
            <View style={{ flex: 1 }} />
            <Text style={[styles.counterText, { fontFamily: bodyFont }]}>
              {countChars(bio)} / {BIO_MAX}
            </Text>
          </View>
          {fieldErrors.bio && (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.errorText, { fontFamily: bodyFont }]}
            >
              {fieldIssueMessage(fieldErrors.bio, ko)}
            </Text>
          )}
        </View>

        {!!formError && (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.errorText, { fontFamily: bodyFont }]}
          >
            {formError}
          </Text>
        )}

        {refreshFailed ? (
          <Button
            language={language}
            disabled={locked}
            label={locked ? copy.savingButton : copy.retryRefresh}
            onPress={() => void handleRetryRefresh()}
          />
        ) : (
          <Button
            language={language}
            disabled={locked}
            label={locked ? copy.savingButton : copy.nextButton}
            onPress={() => void handleSubmit()}
          />
        )}

        {submitting && (
          <Button
            secondary
            language={language}
            label={copy.cancelButton}
            onPress={handleCancelSubmit}
          />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    gap: theme.space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: theme.size.appbar,
  },
  backButton: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: theme.typography.title2.fontSize,
    lineHeight: theme.typography.title2.lineHeight,
    color: theme.color.text,
  },
  headerSpacer: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
  },
  avatarSection: {
    alignItems: "center",
    gap: theme.space.sm,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.color.background,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.color.background,
    borderWidth: 1,
    borderColor: theme.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    minWidth: theme.size.touchMin,
    minHeight: theme.size.touchMin,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.main,
    borderWidth: 2,
    borderColor: theme.color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  photoActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.space.sm,
  },
  photoTextButton: {
    minHeight: theme.size.touchMin,
    minWidth: theme.size.touchMin,
    justifyContent: "center",
    paddingHorizontal: theme.space.sm,
  },
  photoActionLabel: {
    fontSize: theme.typography.caption1.fontSize,
    color: theme.color.orangeInk,
  },
  fieldGroup: {
    gap: theme.space.xs,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space.sm,
  },
  hintText: {
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    color: theme.color.muted,
  },
  counterText: {
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    color: theme.color.text,
  },
  segmentTrack: {
    flexDirection: "row",
    backgroundColor: theme.color.background,
    borderRadius: theme.radius.input,
    padding: theme.space.xs,
    gap: theme.space.xs,
  },
  segmentButton: {
    flex: 1,
    minHeight: theme.size.touchMin,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space.xs,
  },
  segmentButtonSelected: {
    backgroundColor: theme.color.white,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  segmentLabel: {
    fontSize: theme.typography.caption1.fontSize,
    color: theme.color.muted,
    textAlign: "center",
  },
  bioInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.color.dangerInk,
  },
});
