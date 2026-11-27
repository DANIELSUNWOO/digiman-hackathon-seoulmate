import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRole } from "../src/state";
import { useSession } from "../src/session";
import { validateCredentials } from "../src/authValidation";
import { errorMessage } from "../src/authMessages";
import { Button, Input, Label, Screen } from "../src/ui";
import { theme } from "../src/theme";
export default function Email() {
  const router = useRouter();
  const { role, ready: roleReady } = useRole();
  const { session, ready, busy, flow } = useSession();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [informational, setInformational] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  if (!roleReady || !ready) return null;
  if (session && !busy && !submitting) return <Redirect href="/account" />;
  if (!role) return <Redirect href="/country" />;
  const ko = role === "mate",
    language = ko ? "ko" : "ja";
  const locked = busy || submitting;
  async function submit() {
    if (locked) return;
    setInformational(false);
    const issue = validateCredentials(email, password, signup, confirm, agree);
    if (issue) {
      setMessage(
        issue === "credentials"
          ? ko
            ? "이메일과 비밀번호를 확인해 주세요."
            : "メールアドレスとパスワードを確認してください。"
          : ko
            ? "비밀번호는 8자 이상이어야 하며 확인 입력과 동의가 필요합니다."
            : "パスワードは8文字以上で、確認入力と同意が必要です。",
      );
      return;
    }
    if (!flow) {
      setMessage(
        ko ? "서비스 연결을 준비 중입니다." : "サービスへの接続を準備中です。",
      );
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const result = await flow.authenticate({
        email,
        password,
        signup,
        country: ko ? "KR" : "JP",
        confirmPassword: confirm,
        agreeTerms: agree,
      });
      if (result === "duplicate")
        setMessage(
          ko
            ? "이미 사용 중인 이메일입니다. 로그인해 주세요."
            : "登録済みのメールアドレスです。ログインしてください。",
        );
      else if (result === "confirm") {
        setInformational(true);
        setMessage(
          ko
            ? "이메일을 확인하거나 로그인해 주세요."
            : "メールを確認するか、ログインしてください。",
        );
      }
    } catch (error) {
      setMessage(errorMessage(error, ko));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ gap: 16, flex: 1 }}
      >
        <Button
          secondary
          language={language}
          label={ko ? "뒤로" : "戻る"}
          disabled={locked}
          onPress={() => router.dismissTo("/auth")}
        />
        <Label title language={language}>
          {signup
            ? ko
              ? "이메일 가입"
              : "メールで登録"
            : ko
              ? "이메일 로그인"
              : "メールでログイン"}
        </Label>
        <Label language={language}>{ko ? "이메일" : "メールアドレス"}</Label>
        <Input
          accessibilityLabel={ko ? "이메일" : "メールアドレス"}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          editable={!locked}
        />
        <Label language={language}>{ko ? "비밀번호" : "パスワード"}</Label>
        <Input
          accessibilityLabel={ko ? "비밀번호" : "パスワード"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!locked}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? ko
                ? "비밀번호 숨기기"
                : "パスワードを隠す"
              : ko
                ? "비밀번호 표시"
                : "パスワードを表示"
          }
          onPress={() => setVisible(!visible)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Label language={language}>
            {visible
              ? ko
                ? "비밀번호 숨기기"
                : "パスワードを隠す"
              : ko
                ? "비밀번호 표시"
                : "パスワードを表示"}
          </Label>
        </Pressable>
        {signup && (
          <>
            <Label language={language}>
              {ko ? "비밀번호 확인" : "パスワード確認"}
            </Label>
            <Input
              accessibilityLabel={ko ? "비밀번호 확인" : "パスワード確認"}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!locked}
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
          </>
        )}
        {!!message && (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: informational ? theme.color.text : theme.color.dangerInk,
              fontFamily: ko
                ? "NotoSansKR_400Regular"
                : "NotoSansJP_400Regular",
            }}
          >
            {message}
          </Text>
        )}
        <Button
          language={language}
          disabled={locked}
          label={
            locked
              ? ko
                ? "처리 중"
                : "処理中"
              : signup
                ? ko
                  ? "가입하기"
                  : "登録する"
                : ko
                  ? "로그인"
                  : "ログイン"
          }
          onPress={submit}
        />
        <Button
          secondary
          language={language}
          disabled={locked}
          label={
            signup
              ? ko
                ? "로그인으로 전환"
                : "ログインへ"
              : ko
                ? "이메일 가입"
                : "メールで登録"
          }
          onPress={() => {
            setSignup(!signup);
            setMessage("");
            setConfirm("");
            setAgree(false);
          }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
