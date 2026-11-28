import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LogoMark, SplashArcSlogan } from "../src/brandAssets";
import { theme } from "../src/theme";
import { useRole } from "../src/state";
import { useSession } from "../src/session";
import { nextStep, onboardingRouteFor } from "../src/users";

export function detectSplashLanguage(localeHint?: string | null): "ko" | "ja" {
  try {
    const navLocale =
      typeof navigator !== "undefined"
        ? navigator.languages?.[0] || navigator.language
        : undefined;
    const raw =
      localeHint ?? navLocale ?? Intl.DateTimeFormat().resolvedOptions().locale;
    if (typeof raw === "string" && raw.trim().toLowerCase().startsWith("ja")) {
      return "ja";
    }
  } catch {
    /* Fallback to Korean when runtime locale is unavailable. */
  }
  return "ko";
}

export default function Splash() {
  const { ready: roleReady } = useRole();
  const { session, ready, load, busy } = useSession();
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), 2000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!elapsed || !roleReady || !ready || busy) return;
    if (!session) router.replace("/country");
    else if (load.kind === "ready")
      router.replace(onboardingRouteFor(nextStep(load.me)));
    else if (load.kind !== "loading") router.replace("/account");
  }, [elapsed, roleReady, ready, session, load, busy]);

  const lang = detectSplashLanguage();
  const isKo = lang === "ko";
  // The Korean and Japanese splash slogans are confirmed.
  const slogan = isKo
    ? "서울 사는 메이트가 알려주는"
    : "ソウルに住むメイトが教える";
  const headline = isKo ? "서울의 비밀지도" : "ソウルの秘密地図";
  const brandName = isKo ? "서울메이트" : "ソウルメイト";
  const sloganFont = isKo ? "NotoSansKR_700Bold" : "NotoSansJP_700Bold";
  const wordmarkFont = isKo ? "Cafe24Ssurround" : "ZenMaruGothic_900Black";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isKo ? "시작하기" : "はじめる"}
      onPress={() => setElapsed(true)}
      style={s.root}
    >
      <View style={s.centerBlock}>
        <SplashArcSlogan
          text={slogan}
          fontFamily={sloganFont}
          color={theme.color.labelDesc}
        />
        <Text
          style={[
            s.headline,
            { fontFamily: wordmarkFont },
            !isKo && s.headlineJp,
          ]}
        >
          {headline}
        </Text>
        <View style={s.markWrap}>
          <LogoMark size={112} variant="blue" />
        </View>
      </View>
      <Text
        style={[
          s.bottomWordmark,
          { fontFamily: wordmarkFont },
          !isKo && s.bottomWordmarkJp,
        ]}
      >
        {brandName}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.surface,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space.screen,
  },
  centerBlock: {
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    fontSize: 40,
    lineHeight: 48,
    color: theme.color.labelNormal,
    textAlign: "center",
    marginTop: 2,
  },
  headlineJp: {
    fontSize: 32,
    lineHeight: 40,
  },
  markWrap: {
    marginTop: 22,
  },
  bottomWordmark: {
    position: "absolute",
    bottom: 56,
    fontSize: 17,
    lineHeight: 24,
    color: theme.color.labelAssist,
  },
  bottomWordmarkJp: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 1,
  },
});
