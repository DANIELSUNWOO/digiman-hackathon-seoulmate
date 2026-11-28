import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRole } from "../src/state";
import { useSession } from "../src/session";
import {
  validateCredentialFields,
  type AuthFieldErrors,
} from "../src/authValidation";
import { errorMessage } from "../src/authMessages";
import {
  AppBar,
  Button,
  ErrorNotice,
  HelperNotice,
  Input,
  Label,
  Notice,
  Screen,
  ScreenFooter,
  TextLink,
} from "../src/ui";
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
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [commonError, setCommonError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!roleReady || !ready) return null;
  if (session && !busy && !submitting) return <Redirect href="/account" />;
  if (!role) return <Redirect href="/country" />;

  const ko = role === "mate";
  const language = ko ? "ko" : "ja";
  const locked = busy || submitting;
  const inlineErrorFont = ko ? "NotoSansKR_500Medium" : "NotoSansJP_500Medium";
  const helperFont = ko ? "NotoSansKR_400Regular" : "NotoSansJP_400Regular";

  async function submit() {
    if (locked) return;
    setInfoMessage("");
    setCommonError("");
    const issues = validateCredentialFields(
      email,
      password,
      signup,
      confirm,
      agree,
    );
    if (Object.keys(issues).length > 0) {
      setFieldErrors(issues);
      return;
    }
    if (!flow) {
      setCommonError(
        ko ? "서비스 연결을 준비 중입니다." : "サービスへの接続を準備中です。",
      );
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
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
        setCommonError(
          ko
            ? "이미 사용 중인 이메일입니다. 로그인해 주세요."
            : "登録済みのメールアドレスです。ログインしてください。",
        );
      else if (result === "confirm") {
        setInfoMessage(
          ko
            ? "이메일을 확인하거나 로그인해 주세요."
            : "メールを確認するか、ログインしてください。",
        );
      }
    } catch (error) {
      setCommonError(errorMessage(error, ko));
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = signup
    ? ko
      ? "이메일 가입"
      : "メールで登録"
    : ko
      ? "이메일 로그인"
      : "メールでログイン";

  return (
    <Screen contentStyle={s.content}>
      <View style={s.body}>
        <AppBar
          title={pageTitle}
          language={language}
          backLabel={ko ? "뒤로" : "戻る"}
          backDisabled={locked}
          onBack={() => router.dismissTo("/auth")}
        />

        <Label title language={language}>
          {pageTitle}
        </Label>

        <View style={s.formGroup}>
          <View style={s.field}>
            <Label variant="label" tone="neutral" language={language}>
              {ko ? "이메일" : "メールアドレス"}
            </Label>
            <Input
              language={language}
              accessibilityLabel={ko ? "이메일" : "メールアドレス"}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
                setCommonError("");
                setInfoMessage("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              editable={!locked}
              error={!!fieldErrors.email || !!commonError}
            />
            {fieldErrors.email && (
              <Text
                accessibilityLiveRegion="polite"
                style={[s.inlineErrorText, { fontFamily: inlineErrorFont }]}
              >
                {ko
                  ? "올바른 이메일 주소를 입력해 주세요."
                  : "正しいメールアドレスを入力してください。"}
              </Text>
            )}
          </View>

          <View style={s.field}>
            <Label variant="label" tone="neutral" language={language}>
              {ko ? "비밀번호" : "パスワード"}
            </Label>
            <Input
              language={language}
              accessibilityLabel={ko ? "비밀번호" : "パスワード"}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setFieldErrors((prev) => ({
                  ...prev,
                  password: undefined,
                  confirm: undefined,
                }));
                setCommonError("");
                setInfoMessage("");
              }}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!locked}
              error={!!fieldErrors.password || !!commonError}
            />
            {fieldErrors.password ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[s.inlineErrorText, { fontFamily: inlineErrorFont }]}
              >
                {fieldErrors.password === "PASSWORD_REQUIRED"
                  ? ko
                    ? "비밀번호를 입력해 주세요."
                    : "パスワードを入力してください。"
                  : ko
                    ? "비밀번호는 8자 이상 입력해 주세요."
                    : "パスワードは8文字以上で入力してください。"}
              </Text>
            ) : (
              signup && (
                <Text style={[s.inlineHelperText, { fontFamily: helperFont }]}>
                  {ko
                    ? "8자 이상 입력해 주세요"
                    : "8文字以上で入力してください"}
                </Text>
              )
            )}
            <View style={s.linkStart}>
              <TextLink
                language={language}
                label={
                  visible
                    ? ko
                      ? "비밀번호 숨기기"
                      : "パスワードを隠す"
                    : ko
                      ? "비밀번호 표시"
                      : "パスワードを表示"
                }
                onPress={() => setVisible(!visible)}
              />
            </View>
          </View>

          {signup && (
            <View style={s.field}>
              <Label variant="label" tone="neutral" language={language}>
                {ko ? "비밀번호 확인" : "パスワード確認"}
              </Label>
              <Input
                language={language}
                accessibilityLabel={ko ? "비밀번호 확인" : "パスワード確認"}
                value={confirm}
                onChangeText={(value) => {
                  setConfirm(value);
                  setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
                  setCommonError("");
                }}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!locked}
                error={!!fieldErrors.confirm}
              />
              {fieldErrors.confirm && (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[s.inlineErrorText, { fontFamily: inlineErrorFont }]}
                >
                  {ko
                    ? "비밀번호가 일치하지 않습니다."
                    : "パスワードが一致しません。"}
                </Text>
              )}
            </View>
          )}

          {!!commonError && (
            <ErrorNotice language={language}>{commonError}</ErrorNotice>
          )}
        </View>

        {signup && (
          <View style={s.termsGroup}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agree, disabled: locked }}
              aria-checked={agree}
              aria-disabled={locked}
              disabled={locked}
              onPress={() => {
                setAgree(!agree);
                setFieldErrors((prev) => ({ ...prev, agree: undefined }));
                setCommonError("");
              }}
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
            {fieldErrors.agree && (
              <Text
                accessibilityLiveRegion="polite"
                style={[s.inlineErrorText, { fontFamily: inlineErrorFont }]}
              >
                {ko ? "약관에 동의해 주세요." : "規約に同意してください。"}
              </Text>
            )}
          </View>
        )}

        {!!infoMessage && <Notice language={language}>{infoMessage}</Notice>}

        <ScreenFooter>
          <View style={s.switchRow}>
            <Label variant="caption" tone="desc" language={language}>
              {signup
                ? ko
                  ? "이미 계정이 있나요?"
                  : "すでにアカウントをお持ちですか？"
                : ko
                  ? "계정이 없으신가요?"
                  : "アカウントをお持ちでないですか？"}
            </Label>
            <TextLink
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
                setFieldErrors({});
                setCommonError("");
                setInfoMessage("");
                setConfirm("");
                setAgree(false);
              }}
            />
          </View>
          <Button
            language={language}
            loading={submitting}
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
        </ScreenFooter>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    gap: 0,
  },
  body: {
    flexGrow: 1,
    gap: theme.space.md,
  },
  formGroup: {
    gap: theme.space.lg,
  },
  field: {
    gap: theme.space.sm,
  },
  linkStart: {
    alignItems: "flex-start",
  },
  termsGroup: {
    gap: 6,
  },
  inlineHelperText: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.labelDesc,
  },
  inlineErrorText: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.dangerPress,
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
  },
});
