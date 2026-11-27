import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRole } from "../src/state";
import { useSession } from "../src/session";
import { nextStep, onboardingRouteFor } from "../src/users";
import { errorMessage, noticeMessage } from "../src/authMessages";
import {
  AppBar,
  Button,
  Card,
  ErrorNotice,
  HelperNotice,
  Label,
  Notice,
  Screen,
  ScreenFooter,
  TextLink,
} from "../src/ui";
import { theme } from "../src/theme";
import { ApiError } from "../src/api";

export default function Account() {
  const router = useRouter();
  const { role, ready: roleReady, syncServerRole } = useRole();
  const { session, ready, load, busy, flow, notice, registrationError } =
    useSession();
  const [agree, setAgree] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setAgree(false);
    setMessage("");
  }, [session?.user.id]);

  useEffect(() => {
    if (load.kind === "ready")
      syncServerRole(load.me.role === "MATE" ? "mate" : "traveler");
  }, [load.kind === "ready" ? load.me.role : null]);

  if (!roleReady || !ready) return null;
  if (!session && !notice) return <Redirect href="/auth" />;

  const ko =
    load.kind === "ready" ? load.me.language === "ko" : role === "mate";
  const language = ko ? "ko" : "ja";
  const locked = busy || pending;
  const stateError = load.kind === "error" ? load.error : registrationError;
  const withdrawn =
    stateError instanceof ApiError &&
    stateError.serverError?.code === "WITHDRAWN_USER";

  const hasPrimaryAction =
    !!session &&
    ((load.kind === "missing" && !withdrawn) ||
      (load.kind === "ready" &&
        (!nextStep(load.me) ||
          nextStep(load.me) === "verification" ||
          nextStep(load.me) === "profile")));

  async function action(fn: () => Promise<void>) {
    if (locked) return;
    setPending(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      const snapshot = flow?.snapshot();
      if (snapshot?.load.kind !== "error" && !snapshot?.registrationError)
        setMessage(errorMessage(e, ko));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <AppBar title={ko ? "계정" : "アカウント"} language={language} />

      {notice && (
        <View style={s.section}>
          <Notice language={language}>{noticeMessage(notice, ko)}</Notice>
          <Button
            secondary
            language={language}
            label={ko ? "확인" : "確認"}
            onPress={() => {
              flow?.dismissNotice();
              if (!session) router.replace("/auth");
            }}
          />
        </View>
      )}

      {session && (load.kind === "loading" || busy) && (
        <Notice language={language}>
          {ko ? "확인 중입니다" : "確認中です"}
        </Notice>
      )}

      {session && load.kind === "missing" && !withdrawn && (
        <View style={s.section}>
          <Card>
            <View style={s.cardBody}>
              <Label variant="body2" weight="bold" language={language}>
                {ko
                  ? "회원 등록을 완료해 주세요."
                  : "会員登録を完了してください。"}
              </Label>
              <Label variant="desc" tone="desc" language={language}>
                {ko
                  ? `선택한 국적: ${role === "mate" ? "한국" : role === "traveler" ? "일본" : "선택하지 않음"}`
                  : `選択した国: ${role === "mate" ? "韓国" : role === "traveler" ? "日本" : "未選択"}`}
              </Label>
            </View>
          </Card>
          <Button
            secondary
            language={language}
            disabled={locked}
            label={ko ? "국적 다시 선택" : "国を選び直す"}
            onPress={() => router.push("/country")}
          />
          <View style={s.termsGroup}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agree, disabled: locked }}
              aria-checked={agree}
              aria-disabled={locked}
              disabled={locked}
              onPress={() => setAgree(!agree)}
              style={[s.checkRow, agree && s.checkRowActive]}
            >
              <Label language={language} selected={agree}>
                {ko ? "약관에 동의합니다" : "規約に同意します"}
              </Label>
              <View style={[s.checkCircle, agree && s.checkCircleActive]}>
                <Text style={s.checkMark}>✓</Text>
              </View>
            </Pressable>
            <HelperNotice language={language}>
              {ko
                ? "약관 원문은 아직 제공되지 않았습니다."
                : "利用規約の本文はまだ提供されていません。"}
            </HelperNotice>
          </View>
        </View>
      )}

      {session && registrationError != null && load.kind !== "error" && (
        <ErrorNotice language={language}>
          {errorMessage(registrationError, ko)}
        </ErrorNotice>
      )}

      {session && load.kind === "error" && (
        <View style={s.section}>
          <ErrorNotice language={language}>
            {errorMessage(load.error, ko)}
          </ErrorNotice>
          {!withdrawn && (
            <Button
              secondary
              language={language}
              disabled={locked || !flow}
              label={ko ? "다시 시도" : "再試行"}
              onPress={() => {
                if (flow) void action(() => flow.refreshMember());
              }}
            />
          )}
        </View>
      )}

      {session && load.kind === "ready" && (
        <View style={s.section}>
          <Card>
            <View style={s.cardBody}>
              <Label variant="body2" weight="bold" language={language}>
                {ko
                  ? "회원 등록이 확인되었습니다."
                  : "会員登録を確認しました。"}
              </Label>
              <Label variant="desc" tone="desc" language={language}>
                {ko
                  ? `역할: ${load.me.role === "MATE" ? "메이트" : "여행자"}`
                  : `役割: ${load.me.role === "MATE" ? "メイト" : "旅行者"}`}
              </Label>
              {load.me.nickname && (
                <Label variant="desc" tone="desc" language={language}>
                  {ko
                    ? `닉네임: ${load.me.nickname}`
                    : `ニックネーム: ${load.me.nickname}`}
                </Label>
              )}
            </View>
          </Card>

          {nextStep(load.me) &&
            nextStep(load.me) !== "verification" &&
            nextStep(load.me) !== "profile" && (
              <Notice language={language}>
                {ko
                  ? `다음 단계: ${{ verification: "본인 인증", profile: "프로필 등록", tags: "취향 등록", preferences: "매칭 조건", trip: "여행 일정" }[nextStep(load.me)!]} 준비 중`
                  : `次のステップ: ${{ verification: "本人確認", profile: "プロフィール登録", tags: "好みの登録", preferences: "マッチング条件", trip: "旅行日程" }[nextStep(load.me)!]} は準備中です`}
              </Notice>
            )}
        </View>
      )}

      {!!message && <ErrorNotice language={language}>{message}</ErrorNotice>}

      {session && (
        <ScreenFooter>
          {hasPrimaryAction ? (
            <>
              <View style={s.quietRow}>
                <TextLink
                  variant="quiet"
                  language={language}
                  disabled={locked || !flow}
                  label={ko ? "로그아웃" : "ログアウト"}
                  onPress={() => {
                    if (flow) void action(() => flow.logout());
                  }}
                />
              </View>
              {load.kind === "missing" && !withdrawn ? (
                <Button
                  language={language}
                  loading={pending}
                  disabled={locked || !agree || !role || !flow}
                  label={ko ? "등록하기" : "登録する"}
                  onPress={() => {
                    if (flow && role)
                      void action(() =>
                        flow.register(role === "mate" ? "KR" : "JP", agree),
                      );
                  }}
                />
              ) : load.kind === "ready" &&
                nextStep(load.me) === "verification" ? (
                <Button
                  language={language}
                  disabled={locked}
                  label={ko ? "본인 인증 시작하기" : "本人確認を始める"}
                  onPress={() =>
                    router.push(onboardingRouteFor("verification"))
                  }
                />
              ) : load.kind === "ready" && nextStep(load.me) === "profile" ? (
                <Button
                  language={language}
                  disabled={locked}
                  label={ko ? "프로필 등록하기" : "プロフィールを登録する"}
                  onPress={() => router.push(onboardingRouteFor("profile"))}
                />
              ) : (
                <Button
                  language={language}
                  label={ko ? "홈으로" : "ホームへ"}
                  onPress={() => router.replace("/(tabs)")}
                />
              )}
            </>
          ) : (
            <Button
              secondary
              language={language}
              loading={pending}
              disabled={locked || !flow}
              label={ko ? "로그아웃" : "ログアウト"}
              onPress={() => {
                if (flow) void action(() => flow.logout());
              }}
            />
          )}
        </ScreenFooter>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  section: {
    gap: theme.space.md,
  },
  cardBody: {
    gap: theme.space.xs,
  },
  termsGroup: {
    gap: 6,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: theme.size.touchMin,
    backgroundColor: theme.color.surface2,
    borderRadius: theme.radius.input,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
  },
  checkRowActive: {
    backgroundColor: theme.color.brandTint,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.checkOff,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleActive: {
    backgroundColor: theme.color.brandDeep,
  },
  checkMark: {
    color: theme.color.surface,
    fontSize: 12,
    fontWeight: "700",
  },
  quietRow: {
    alignItems: "center",
  },
});
