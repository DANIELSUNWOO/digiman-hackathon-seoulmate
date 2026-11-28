import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  Camera,
  CaretLeft,
  CheckCircle,
  UserSquare,
} from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiError } from "../../src/api";
import {
  executeVerificationFlow,
  prepareVerificationFile,
} from "../../src/features/onboarding/api";
import type { LocalProfilePhoto } from "../../src/features/onboarding/draftStore";
import {
  onboardingApiMessage,
  verificationCopy,
} from "../../src/features/onboarding/messages";
import {
  parseOnboardingOrigin,
  previousOnboardingRoute,
  useOnboardingBackHandler,
  useOnboardingDismiss,
} from "../../src/features/onboarding/navigation";
import {
  pickImageAsset,
  writeNativeDemoPassportTempFile,
} from "../../src/features/onboarding/photo";
import { useSession } from "../../src/session";
import { theme } from "../../src/theme";
import {
  AppBar,
  Button,
  ErrorNotice,
  Label,
  Notice,
  ProgressTracker,
  Screen,
  ScreenFooter,
  TextLink,
} from "../../src/ui";
import { nextStep, onboardingRouteFor } from "../../src/users";

const TRAVELER_STEPS = ["本人確認", "基本情報", "好み", "条件", "日程"];
const PASSPORT_ASPECT_RATIO = 125 / 88;

export default function VerificationScreen() {
  const router = useRouter();
  const dismiss = useOnboardingDismiss();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const origin = parseOnboardingOrigin(from);
  const { session, load, busy, flow } = useSession();
  const [selectedSample, setSelectedSample] =
    useState<LocalProfilePhoto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [refreshFailed, setRefreshFailed] = useState(false);

  const userId = session?.user.id ?? null;
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
    setSelectedSample(null);
    setErrorText("");
    setRefreshFailed(false);
    submittingRef.current = false;
    setSubmitting(false);
  }, [userId]);

  function handleCancelSubmit() {
    attemptRef.current += 1;
    submitControllerRef.current?.abort();
    submitControllerRef.current = null;
    submittingRef.current = false;
    setSubmitting(false);
  }

  function handleBack() {
    if (submitting) handleCancelSubmit();
    const role = load.kind === "ready" ? load.me.role : "TRAVELER";
    dismiss(previousOnboardingRoute(role, "verification", origin));
  }

  useOnboardingBackHandler(() => {
    handleBack();
    return true;
  });

  if (!session || load.kind !== "ready") return null;

  const step = nextStep(load.me);
  if (load.me.role === "MATE") {
    return <Redirect href={onboardingRouteFor(step)} />;
  }
  const isVerifiedRevisit =
    load.me.onboarding.verified && origin === "onboarding";
  if (load.me.onboarding.verified && !isVerifiedRevisit) {
    return <Redirect href={onboardingRouteFor(step)} />;
  }

  const ko = load.me.language === "ko";
  const language = ko ? "ko" : "ja";
  const copy = verificationCopy(ko);
  const locked = busy || submitting;
  const bodyFont = ko ? "NotoSansKR_400Regular" : "NotoSansJP_400Regular";
  const boldFont = ko ? "NotoSansKR_700Bold" : "NotoSansJP_700Bold";

  function isSameContext(expectedUserId: string) {
    return mountedRef.current && latestUserRef.current === expectedUserId;
  }

  async function handlePick(source: "library" | "camera") {
    if (locked) return;
    setErrorText("");
    setRefreshFailed(false);
    const activeId = session!.user.id;
    try {
      const picked = await pickImageAsset(source, { square: false });
      if (!isSameContext(activeId) || !picked) return;
      setSelectedSample(picked);
    } catch (error) {
      if (!isSameContext(activeId)) return;
      setErrorText(onboardingApiMessage(error, ko));
    }
  }

  async function handleVerify() {
    if (locked || submittingRef.current || !flow || !session) return;
    const activeId = session.user.id;
    const token = session.access_token;
    const attemptId = ++attemptRef.current;
    const controller = new AbortController();
    submitControllerRef.current = controller;
    submittingRef.current = true;
    setSubmitting(true);
    setErrorText("");
    setRefreshFailed(false);

    try {
      const result = await executeVerificationFlow({
        token,
        prepareFile: () =>
          prepareVerificationFile({
            platform: Platform.OS,
            selectedSample,
            writeNativeTempFile: writeNativeDemoPassportTempFile,
          }),
        refreshMember: () => flow.refreshMember(),
        getMe: () => {
          const snap = flow.snapshot();
          return snap.load.kind === "ready" ? snap.load.me : null;
        },
        isCurrentAccount: () => isSameContext(activeId),
        signal: controller.signal,
      });

      if (!isSameContext(activeId) || attemptRef.current !== attemptId) return;
      if (result.kind === "verified") {
        setSelectedSample(null);
        const updatedLoad = flow.snapshot().load;
        const next =
          updatedLoad.kind === "ready" ? nextStep(updatedLoad.me) : null;
        const target =
          next === "profile"
            ? "/(onboarding)/profile?from=onboarding"
            : updatedLoad.kind === "ready"
              ? onboardingRouteFor(next)
              : "/account";
        router.replace(target);
      } else if (result.kind === "refresh_failed") {
        setRefreshFailed(true);
        setErrorText(copy.refreshFailed);
      }
    } catch (error) {
      if (!isSameContext(activeId) || attemptRef.current !== attemptId) return;
      if (error instanceof ApiError && error.code === "ABORTED") {
        setErrorText(onboardingApiMessage(error, ko));
      } else {
        setErrorText(onboardingApiMessage(error, ko));
      }
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
    setErrorText("");
    try {
      await flow.refreshMember();
      if (!isSameContext(activeId) || attemptRef.current !== attemptId) return;
      const snap = flow.snapshot();
      if (snap.load.kind === "ready") {
        const next = nextStep(snap.load.me);
        if (next !== "verification") {
          setRefreshFailed(false);
          router.replace(
            next === "profile"
              ? "/(onboarding)/profile?from=onboarding"
              : onboardingRouteFor(next),
          );
          return;
        }
      }
      setRefreshFailed(true);
      setErrorText(copy.refreshFailed);
    } catch (error) {
      if (!isSameContext(activeId) || attemptRef.current !== attemptId) return;
      setRefreshFailed(true);
      setErrorText(onboardingApiMessage(error, ko));
    } finally {
      if (mountedRef.current && attemptRef.current === attemptId) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  }

  if (isVerifiedRevisit) {
    return (
      <Screen contentStyle={styles.content}>
        <View style={styles.onboardingTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.backLabel}
            disabled={busy}
            onPress={handleBack}
            style={styles.backButton}
          >
            <CaretLeft size={theme.size.icon} color={theme.color.labelNormal} />
          </Pressable>
          <ProgressTracker
            steps={TRAVELER_STEPS}
            currentIndex={0}
            language={language}
          />
        </View>

        <View style={styles.verifiedState}>
          <View style={styles.verifiedBadge}>
            <CheckCircle size={36} color={theme.color.positive} weight="fill" />
          </View>
          <Label title language={language}>
            {copy.alreadyVerifiedTitle}
          </Label>
          <Text style={[styles.desc, { fontFamily: bodyFont }]}>
            {copy.alreadyVerifiedDesc}
          </Text>
        </View>

        <ScreenFooter>
          <Button
            language={language}
            label={copy.nextButton}
            onPress={() =>
              router.replace("/(onboarding)/profile?from=onboarding")
            }
          />
        </ScreenFooter>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      {ko ? (
        <AppBar
          title={copy.headerTitle}
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
            <CaretLeft size={theme.size.icon} color={theme.color.labelNormal} />
          </Pressable>
          <ProgressTracker
            steps={TRAVELER_STEPS}
            currentIndex={0}
            language="ja"
          />
        </View>
      )}

      <View style={styles.intro}>
        <Label title language={language}>
          {copy.headline}
        </Label>
        <Text style={[styles.desc, { fontFamily: bodyFont }]}>
          {copy.description}
        </Text>
      </View>

      <View style={styles.frameOuter}>
        <View style={styles.frameDashed}>
          {selectedSample ? (
            <Image
              source={{ uri: selectedSample.uri }}
              style={styles.previewImage}
              resizeMode="cover"
              accessibilityLabel={copy.selectedLabel}
            />
          ) : (
            <View style={styles.passportSample}>
              <Text style={[styles.passportBadge, { fontFamily: boldFont }]}>
                {copy.frameCaption}
              </Text>
              <View style={styles.sampleBody}>
                <View style={styles.sampleAvatar}>
                  <UserSquare size={36} color={theme.color.labelAssist} />
                </View>
                <View style={styles.sampleLines}>
                  <View style={[styles.sampleBar, { width: "85%" }]} />
                  <View style={[styles.sampleBar, { width: "65%" }]} />
                  <View style={[styles.sampleBar, { width: "75%" }]} />
                  <View style={[styles.sampleBar, { width: "50%" }]} />
                </View>
              </View>
              <Text style={styles.mrzText}>{copy.frameSampleLine1}</Text>
              <Text style={styles.mrzText}>{copy.frameSampleLine2}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.noticeWrap}>
        <Notice language={language}>{copy.infoText}</Notice>
      </View>

      <View style={styles.pickerRow}>
        <View style={styles.pickerCol}>
          <Button
            secondary
            language={language}
            disabled={locked}
            label={copy.pickPhoto}
            onPress={() => void handlePick("library")}
          />
        </View>
        <View style={styles.pickerCol}>
          <Button
            secondary
            language={language}
            disabled={locked}
            label={copy.takePhoto}
            onPress={() => void handlePick("camera")}
          />
        </View>
      </View>

      {!!errorText && (
        <View style={styles.errorWrap}>
          <ErrorNotice language={language}>{errorText}</ErrorNotice>
        </View>
      )}

      <ScreenFooter>
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
            label={locked ? copy.submitting : copy.retryRefresh}
            onPress={() => void handleRetryRefresh()}
          />
        ) : (
          <Button
            language={language}
            loading={submitting}
            disabled={locked}
            icon={
              <Camera size={theme.size.iconSmall} color={theme.color.surface} />
            }
            label={
              locked
                ? copy.submitting
                : selectedSample
                  ? copy.submitSelectedButton
                  : copy.demoButton
            }
            onPress={() => void handleVerify()}
          />
        )}
      </ScreenFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 0,
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
  verifiedState: {
    marginTop: theme.space.xl,
    gap: theme.space.sm,
  },
  verifiedBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.color.positiveSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space.xs,
  },
  intro: {
    marginTop: theme.space.md,
    gap: theme.space.sm,
  },
  desc: {
    fontSize: theme.typography.desc.fontSize,
    lineHeight: theme.typography.desc.lineHeight,
    color: theme.color.labelDesc,
  },
  frameOuter: {
    marginTop: theme.space.group,
    backgroundColor: "#2B2D33",
    borderRadius: theme.radius.card,
    padding: theme.space.md,
  },
  frameDashed: {
    width: "100%",
    aspectRatio: PASSPORT_ASPECT_RATIO,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.color.surface,
    borderRadius: theme.radius.input,
    padding: theme.space.md,
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: theme.radius.sm,
  },
  passportSample: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: theme.radius.sm,
    padding: theme.space.md,
    justifyContent: "space-between",
  },
  passportBadge: {
    alignSelf: "flex-end",
    fontSize: theme.typography.status.fontSize,
    color: "rgba(255, 255, 255, 0.85)",
  },
  sampleBody: {
    flexDirection: "row",
    gap: theme.space.md,
    alignItems: "center",
  },
  sampleAvatar: {
    width: 52,
    height: 64,
    borderRadius: theme.radius.xs,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  sampleLines: {
    flex: 1,
    gap: 6,
  },
  sampleBar: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  mrzText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.78)",
    letterSpacing: 0.6,
  },
  noticeWrap: {
    marginTop: theme.space.lg,
  },
  pickerRow: {
    marginTop: theme.space.md,
    flexDirection: "row",
    gap: theme.space.sm,
  },
  pickerCol: {
    flex: 1,
  },
  errorWrap: {
    marginTop: theme.space.md,
  },
  cancelRow: {
    alignItems: "center",
  },
});
