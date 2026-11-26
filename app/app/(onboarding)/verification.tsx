import { Redirect, useRouter } from "expo-router";
import { CaretLeft, Camera, Info, UserSquare } from "phosphor-react-native";
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
  pickImageAsset,
  writeNativeDemoPassportTempFile,
} from "../../src/features/onboarding/photo";
import { useSession } from "../../src/session";
import { theme } from "../../src/theme";
import { Button, Label, Screen } from "../../src/ui";
import { nextStep, onboardingRouteFor } from "../../src/users";

export default function VerificationScreen() {
  const router = useRouter();
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

  if (!session || load.kind !== "ready") return null;

  const step = nextStep(load.me);
  if (step !== "verification") {
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
        const target =
          updatedLoad.kind === "ready"
            ? onboardingRouteFor(nextStep(updatedLoad.me))
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
          router.replace(onboardingRouteFor(next));
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

  return (
    <Screen>
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
                  <UserSquare size={36} color={theme.color.medium} />
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

      <View style={styles.infoBox}>
        <Info size={theme.size.iconSmall} color={theme.color.text} />
        <Text style={[styles.infoText, { fontFamily: bodyFont }]}>
          {copy.infoText}
        </Text>
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
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.errorText, { fontFamily: bodyFont }]}
        >
          {errorText}
        </Text>
      )}

      {refreshFailed ? (
        <Button
          language={language}
          disabled={locked}
          label={locked ? copy.submitting : copy.retryRefresh}
          onPress={() => void handleRetryRefresh()}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: locked }}
          disabled={locked}
          onPress={() => void handleVerify()}
          style={[styles.primaryButton, locked && styles.primaryDisabled]}
        >
          <Camera
            size={theme.size.iconSmall}
            color={locked ? theme.color.muted : theme.color.text}
          />
          <Text
            style={[
              styles.primaryLabel,
              { fontFamily: boldFont },
              locked && { color: theme.color.muted },
            ]}
          >
            {locked
              ? copy.submitting
              : selectedSample
                ? copy.submitSelectedButton
                : copy.demoButton}
          </Text>
        </Pressable>
      )}

      {submitting && (
        <Button
          secondary
          language={language}
          label={copy.cancelButton}
          onPress={handleCancelSubmit}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  intro: {
    gap: theme.space.sm,
  },
  desc: {
    fontSize: theme.typography.body2.fontSize,
    lineHeight: theme.typography.body2.lineHeight,
    color: theme.color.muted,
  },
  frameOuter: {
    backgroundColor: "#2C2C2C",
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
  },
  frameDashed: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.color.white,
    borderRadius: theme.radius.input,
    padding: theme.space.lg,
    minHeight: 184,
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 164,
    borderRadius: theme.radius.sm,
  },
  passportSample: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: theme.radius.sm,
    padding: theme.space.md,
    gap: theme.space.sm,
  },
  passportBadge: {
    alignSelf: "flex-end",
    fontSize: theme.typography.caption2.fontSize,
    color: "rgba(255, 255, 255, 0.85)",
  },
  sampleBody: {
    flexDirection: "row",
    gap: theme.space.md,
    alignItems: "center",
  },
  sampleAvatar: {
    width: 56,
    height: 68,
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
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.72)",
    letterSpacing: 0.6,
  },
  infoBox: {
    flexDirection: "row",
    gap: theme.space.sm,
    alignItems: "flex-start",
    backgroundColor: theme.color.background,
    borderRadius: theme.radius.input,
    padding: theme.space.lg,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.color.text,
  },
  pickerRow: {
    flexDirection: "row",
    gap: theme.space.sm,
  },
  pickerCol: {
    flex: 1,
  },
  errorText: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.color.dangerInk,
  },
  primaryButton: {
    minHeight: theme.size.button,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.main,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  primaryDisabled: {
    backgroundColor: theme.color.border,
  },
  primaryLabel: {
    fontSize: 15,
    color: theme.color.text,
  },
});
