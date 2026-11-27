import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { useRole } from "../src/state";
import { useSession } from "../src/session";
import { nextStep } from "../src/users";
import { errorMessage, noticeMessage } from "../src/authMessages";
import { Button, Label, Screen } from "../src/ui";
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
  const language = ko ? "ko" : "ja",
    locked = busy || pending;
  const textFont = ko ? "NotoSansKR_400Regular" : "NotoSansJP_400Regular";
  const stateError = load.kind === "error" ? load.error : registrationError;
  const withdrawn =
    stateError instanceof ApiError &&
    stateError.serverError?.code === "WITHDRAWN_USER";
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
      <Label title language={language}>
        {ko ? "계정" : "アカウント"}
      </Label>
      {notice && (
        <>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: theme.color.text, fontFamily: textFont }}
          >
            {noticeMessage(notice, ko)}
          </Text>
          <Button
            secondary
            language={language}
            label={ko ? "확인" : "確認"}
            onPress={() => {
              flow?.dismissNotice();
              if (!session) router.replace("/auth");
            }}
          />
        </>
      )}
      {session && (load.kind === "loading" || busy) && (
        <Label language={language}>{ko ? "확인 중입니다" : "確認中です"}</Label>
      )}
      {session && load.kind === "missing" && !withdrawn && (
        <>
          <Label language={language}>
            {ko ? "회원 등록을 완료해 주세요." : "会員登録を完了してください。"}
          </Label>
          <Label language={language}>
            {ko
              ? `선택한 국적: ${role === "mate" ? "한국" : role === "traveler" ? "일본" : "선택하지 않음"}`
              : `選択した国: ${role === "mate" ? "韓国" : role === "traveler" ? "日本" : "未選択"}`}
          </Label>
          <Button
            secondary
            language={language}
            disabled={locked}
            label={ko ? "국적 다시 선택" : "国を選び直す"}
            onPress={() => router.push("/country")}
          />
          <Label language={language}>
            {ko
              ? "약관 원문은 아직 제공되지 않았습니다."
              : "利用規約の本文はまだ提供されていません。"}
          </Label>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agree, disabled: locked }}
            aria-checked={agree}
            aria-disabled={locked}
            disabled={locked}
            onPress={() => setAgree(!agree)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Label language={language}>
              {agree ? "☑ " : "☐ "}
              {ko ? "약관에 동의합니다" : "規約に同意します"}
            </Label>
          </Pressable>
          <Button
            language={language}
            disabled={locked || !agree || !role || !flow}
            label={ko ? "등록하기" : "登録する"}
            onPress={() => {
              if (flow && role)
                void action(() =>
                  flow.register(role === "mate" ? "KR" : "JP", agree),
                );
            }}
          />
        </>
      )}
      {session && registrationError != null && load.kind !== "error" && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.color.dangerInk, fontFamily: textFont }}
        >
          {errorMessage(registrationError, ko)}
        </Text>
      )}
      {session && load.kind === "error" && (
        <>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: theme.color.dangerInk, fontFamily: textFont }}
          >
            {errorMessage(load.error, ko)}
          </Text>
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
        </>
      )}
      {session && load.kind === "ready" && (
        <>
          <Label language={language}>
            {ko ? "회원 등록이 확인되었습니다." : "会員登録を確認しました。"}
          </Label>
          <Label language={language}>
            {ko
              ? `역할: ${load.me.role === "MATE" ? "메이트" : "여행자"}`
              : `役割: ${load.me.role === "MATE" ? "メイト" : "旅行者"}`}
          </Label>
          {nextStep(load.me) ? (
            <Label language={language}>
              {ko
                ? `다음 단계: ${{ verification: "본인 인증", profile: "프로필 등록", tags: "취향 등록", preferences: "매칭 조건", trip: "여행 일정" }[nextStep(load.me)!]} 준비 중`
                : `次のステップ: ${{ verification: "本人確認", profile: "プロフィール登録", tags: "好みの登録", preferences: "マッチング条件", trip: "旅行日程" }[nextStep(load.me)!]} は準備中です`}
            </Label>
          ) : (
            <Button
              language={language}
              label={ko ? "홈으로" : "ホームへ"}
              onPress={() => router.replace("/(tabs)")}
            />
          )}
        </>
      )}
      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.color.dangerInk, fontFamily: textFont }}
        >
          {message}
        </Text>
      )}
      {session && (
        <Button
          secondary
          language={language}
          disabled={locked || !flow}
          label={ko ? "로그아웃" : "ログアウト"}
          onPress={() => {
            if (flow) void action(() => flow.logout());
          }}
        />
      )}
    </Screen>
  );
}
