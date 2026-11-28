import { Redirect, useRouter } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { LogoMark } from "../src/brandAssets";
import { theme } from "../src/theme";
import { useRole } from "../src/state";
import {
  Button,
  HelperNotice,
  Label,
  Notice,
  Screen,
  ScreenFooter,
} from "../src/ui";
import { useSession } from "../src/session";
import { noticeMessage } from "../src/authMessages";

function SeoulHeroPlaceholder() {
  // SVG placeholder until the selected Hangang and Lotte Tower photo is connected.
  return (
    <View style={s.heroWrap}>
      <Svg
        width="100%"
        height={176}
        viewBox="0 0 390 176"
        preserveAspectRatio="xMidYMid slice"
        accessibilityElementsHidden
      >
        <Defs>
          <SvgLinearGradient id="seoulSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#BFD6FF" />
            <Stop offset="62%" stopColor="#E4EEFF" />
            <Stop offset="100%" stopColor="#FFFFFF" />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={390} height={176} fill="url(#seoulSky)" />
        <Path
          d="M0 132 Q95 112 190 128 T390 122 L390 176 L0 176 Z"
          fill="#DDE9FF"
        />
        <Rect x={46} y={96} width={22} height={46} rx={3} fill="#C6DAFF" />
        <Rect x={76} y={84} width={28} height={58} rx={3} fill="#B8D0FF" />
        <Path d="M188 32 L198 136 L178 136 Z" fill="#9DBBFF" />
        <Rect x={260} y={92} width={30} height={50} rx={3} fill="#C6DAFF" />
        <Rect x={298} y={102} width={24} height={40} rx={3} fill="#D4E3FF" />
        <Rect x={0} y={136} width={390} height={40} fill="#F2F6FF" />
        <Path d="M0 144 H390 V176 H0 Z" fill="#FFFFFF" opacity={0.85} />
      </Svg>
    </View>
  );
}

export default function Auth() {
  const router = useRouter();
  const { role, ready } = useRole();
  const {
    notice,
    flow,
    session,
    busy,
    load,
    ready: sessionReady,
  } = useSession();
  if (!ready || !sessionReady) return null;
  if (!role) return <Redirect href="/country" />;
  const ko = role === "mate";
  const language = ko ? "ko" : "ja";

  return (
    <Screen contentStyle={s.content}>
      <View style={s.heroContainer}>
        <SeoulHeroPlaceholder />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ko ? "뒤로" : "戻る"}
          onPress={() => router.dismissTo("/country")}
          style={s.backButton}
        >
          <CaretLeft size={theme.size.icon} color={theme.color.labelNormal} />
        </Pressable>
      </View>

      <View style={s.body}>
        <View style={s.brandHeader}>
          <View style={s.logoRow}>
            <LogoMark size={ko ? 22 : 19} variant="blue" />
            <Label logo language={language}>
              {ko ? "서울메이트" : "ソウルメイト"}
            </Label>
          </View>
          <Label variant="desc" tone="desc" language={language}>
            {ko
              ? "나만 아는 서울을, 일본에서 온 여행자에게"
              : "ソウルに住む人の「秘密の地図」で旅しよう"}
          </Label>
        </View>

        {notice && (
          <View style={s.noticeSection}>
            <Notice language={language}>{noticeMessage(notice, ko)}</Notice>
            <Button
              secondary
              language={language}
              label={ko ? "확인" : "確認"}
              onPress={() => flow?.dismissNotice()}
            />
          </View>
        )}

        <ScreenFooter>
          <View style={s.socialGroup}>
            <HelperNotice language={language}>
              {ko
                ? "소셜 로그인은 준비 중입니다"
                : "ソーシャルログインは準備中です"}
            </HelperNotice>
            <Button
              label={ko ? "카카오로 계속하기" : "Appleで続ける"}
              language={language}
              secondary
              disabled
            />
            <Button
              label={ko ? "Apple로 계속하기" : "Googleで続ける"}
              language={language}
              secondary
              disabled
            />
            {!ko && (
              <Button
                label="LINEで続ける"
                language={language}
                secondary
                disabled
              />
            )}
          </View>
          {session && !busy && load.kind !== "loading" && (
            <Button
              secondary
              language={language}
              label={ko ? "계정으로" : "アカウントへ"}
              onPress={() => router.push("/account")}
            />
          )}
          <Button
            label={ko ? "이메일로 시작하기" : "メールで始める"}
            language={language}
            disabled={busy}
            onPress={() => router.push("/email")}
          />
        </ScreenFooter>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    paddingTop: 0,
    gap: 0,
  },
  heroContainer: {
    marginHorizontal: -theme.space.screen,
    position: "relative",
  },
  heroWrap: {
    overflow: "hidden",
  },
  backButton: {
    position: "absolute",
    top: theme.space.sm,
    left: theme.space.lg,
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingTop: theme.space.lg,
    gap: theme.space.group,
  },
  brandHeader: {
    gap: theme.space.sm,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noticeSection: {
    gap: theme.space.sm,
  },
  socialGroup: {
    gap: theme.space.sm,
  },
});
