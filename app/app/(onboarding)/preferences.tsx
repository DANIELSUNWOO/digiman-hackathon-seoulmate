import {
  Redirect,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  useOnboardingBackHandler,
  useOnboardingDismiss,
} from "../../src/features/onboarding/navigation";
import {
  clearPreferenceDraft,
  getPreferenceDraft,
  setPreferenceDraft,
  syncPreferenceDraftAccount,
  type PreferenceSelection,
} from "../../src/features/preferences/draft";
import {
  AGE_GROUPS,
  samePreference,
  type GenderPreference,
  type Preference,
} from "../../src/features/preferences/model";
import { createPreferenceSaveFlow } from "../../src/features/preferences/saveFlow";
import { useSession } from "../../src/session";
import { theme } from "../../src/theme";
import {
  AppBar,
  Button,
  Chip,
  ErrorNotice,
  Label,
  ProgressTracker,
  Screen,
  ScreenFooter,
} from "../../src/ui";
const genders: { value: GenderPreference; label: string }[] = [
  { value: "ANY", label: "こだわらない" },

  { value: "FEMALE", label: "女性" },
  { value: "MALE", label: "男性" },
];
const empty: PreferenceSelection = { genderPref: null, ageGroups: [] };
export default function PreferencesScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const origin = from === "account" || from === "explore" ? from : "onboarding";
  const router = useRouter(),
    navigation = useNavigation(),
    dismiss = useOnboardingDismiss();
  const { session, load, flow, ready, busy: sessionBusy } = useSession();
  const userId = session?.user.id ?? "",
    token = session?.access_token ?? "";
  const [status, setStatus] = useState<
      "loading" | "ready" | "saving" | "error"
    >("loading"),
    [selection, setSelection] = useState<PreferenceSelection>(empty),
    [original, setOriginal] = useState<Preference | null>(null);
  const [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [retry, setRetry] = useState(0);
  const attempt = useRef(0),
    mounted = useRef(false),
    saving = useRef(false),
    controller = useRef<AbortController | null>(null),
    discard = useRef(false),
    latest = useRef({ flow, token, navigation });
  latest.current = { flow, token, navigation };
  const active = (n: number, c: AbortController) =>
    mounted.current &&
    attempt.current === n &&
    !c.signal.aborted &&
    latest.current.navigation.isFocused() &&
    latest.current.flow?.snapshot().session?.user.id === userId &&
    latest.current.flow?.snapshot().session?.access_token === token &&
    latest.current.token === token;
  useFocusEffect(
    useCallback(() => {
      if (
        !userId ||
        !token ||
        load.kind !== "ready" ||
        load.me.role !== "TRAVELER" ||
        !load.me.onboarding.tags
      )
        return;
      mounted.current = true;
      saving.current = false;
      syncPreferenceDraftAccount(userId);
      const n = ++attempt.current,
        c = new AbortController();
      controller.current = c;
      setStatus("loading");
      setError("");
      const service = createPreferenceSaveFlow({
        token,
        userId,
        signal: c.signal,
        isCurrent: () => active(n, c),
      });
      void service
        .load()
        .then((value) => {
          if (!active(n, c)) return;
          const saved = discard.current ? null : getPreferenceDraft(userId);
          discard.current = false;
          const baseline = saved ? saved.original : value,
            chosen = saved ? saved.selection : (value ?? empty);
          setOriginal(baseline);
          setSelection(chosen);
          setPreferenceDraft(userId, { original: baseline, selection: chosen });
          const changed = !!saved && !samePreference(saved.original, value);
          setConflict(changed);
          if (changed)
            setError(
              "条件が変更されました。入力は保持しています。最新の条件を読み込むと入力は置き換わります。",
            );
          setStatus("ready");
        })
        .catch(() => {
          if (active(n, c)) {
            setStatus("error");
            setError("条件を読み込めませんでした。もう一度お試しください。");
          }
        });
      return () => {
        mounted.current = false;
        ++attempt.current;
        c.abort();
        controller.current?.abort();
        saving.current = false;
      };
    }, [
      userId,
      token,
      retry,
      load.kind === "ready" &&
        load.me.role === "TRAVELER" &&
        load.me.onboarding.tags,
    ]),
  );
  function back() {
    ++attempt.current;
    controller.current?.abort();
    saving.current = false;
    dismiss(
      origin === "account"
        ? "/account"
        : origin === "explore"
          ? "/explore"
          : "/(onboarding)/tags?from=onboarding",
    );
    return true;
  }
  useOnboardingBackHandler(back);
  function change(next: PreferenceSelection) {
    if (status !== "ready" || saving.current) return;
    setSelection(next);
    setPreferenceDraft(userId, { original, selection: next });
  }
  async function save() {
    if (
      status !== "ready" ||
      saving.current ||
      conflict ||
      !selection.genderPref ||
      !selection.ageGroups.length ||
      !flow
    )
      return;
    const wanted: Preference = {
      genderPref: selection.genderPref,
      ageGroups: selection.ageGroups,
    };
    saving.current = true;
    setStatus("saving");
    setError("");
    const n = ++attempt.current;
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    const service = createPreferenceSaveFlow({
      token,
      userId,
      signal: c.signal,
      isCurrent: () => active(n, c),
    });
    try {
      const result = await service.save(original, wanted);
      if (!active(n, c)) return;
      if (result.kind === "saved") {
        setOriginal(result.preference);
        setPreferenceDraft(userId, {
          original: result.preference,
          selection: wanted,
        });
        await flow.refreshMember();
        if (!active(n, c)) return;
        const snap = flow.snapshot();
        if (
          snap.load.kind !== "ready" ||
          snap.load.me.userId !== userId ||
          !snap.load.me.onboarding.preferences
        ) {
          setError("保存状態を確認できませんでした。もう一度お試しください。");
          return;
        }
        clearPreferenceDraft(userId);
        if (origin === "account") dismiss("/account");
        else if (origin === "explore") dismiss("/explore");
        else router.replace("/(onboarding)/trip?from=onboarding");
        return;
      }
      if (result.kind === "conflict") {
        setConflict(true);
        setError(
          "別の画面で条件が変更されました。最新の条件を読み込んでください。",
        );
      } else if (result.kind === "unconfirmed")
        setError(
          "保存結果を確認できませんでした。再読み込みして確認してください。",
        );
      else if (result.kind === "invalid") setError("条件を確認してください。");
    } catch {
      if (active(n, c))
        setError("保存できませんでした。もう一度お試しください。");
    } finally {
      if (active(n, c)) {
        saving.current = false;
        setStatus("ready");
      }
    }
  }
  if (!ready || sessionBusy || load.kind === "loading") return null;
  if (!session) return <Redirect href="/auth" />;
  if (
    load.kind !== "ready" ||
    load.me.userId !== userId ||
    load.me.role !== "TRAVELER"
  )
    return <Redirect href="/account" />;
  const o = load.me.onboarding;
  if (!o.verified) return <Redirect href="/(onboarding)/verification" />;
  if (!o.profile) return <Redirect href="/(onboarding)/profile" />;
  if (!o.tags) return <Redirect href="/(onboarding)/tags" />;
  return (
    <Screen>
      <AppBar language="ja" onBack={back} />
      <ProgressTracker
        steps={["本人確認", "基本情報", "好み", "条件", "日程"]}
        currentIndex={3}
        language="ja"
      />
      <Label title language="ja">
        どんなメイトがいいですか？
      </Label>
      <Label tone="desc" language="ja">
        希望する条件を選んでください。
      </Label>
      {status === "loading" ? (
        <Label language="ja">読み込み中...</Label>
      ) : status === "error" ? (
        <Button
          secondary
          language="ja"
          label="再読み込み"
          onPress={() => setRetry((x) => x + 1)}
        />
      ) : (
        <>
          <Label weight="bold" language="ja">
            メイトの性別
          </Label>
          <View style={styles.chips}>
            {[
              ...genders,
              ...(original?.genderPref === "SAME"
                ? [{ value: "SAME" as const, label: "同性（保存済み）" }]
                : []),
            ].map((g) => (
              <Chip
                key={g.value}
                language="ja"
                label={g.label}
                selected={selection.genderPref === g.value}
                disabled={status !== "ready"}
                onPress={() => change({ ...selection, genderPref: g.value })}
              />
            ))}
          </View>
          <Label weight="bold" language="ja">
            年齢層
          </Label>
          <Label variant="desc" tone="desc" language="ja">
            複数選択できます。18〜19歳は20代に含まれます。
          </Label>
          <View style={styles.chips}>
            {AGE_GROUPS.map((age) => (
              <Chip
                key={age}
                language="ja"
                label={age === 50 ? "50代以上" : `${age}代`}
                selected={selection.ageGroups.includes(age)}
                disabled={status !== "ready"}
                onPress={() =>
                  change({
                    ...selection,
                    ageGroups: selection.ageGroups.includes(age)
                      ? selection.ageGroups.filter((x) => x !== age)
                      : [...selection.ageGroups, age],
                  })
                }
              />
            ))}
          </View>
        </>
      )}
      {!!error && <ErrorNotice language="ja">{error}</ErrorNotice>}
      {conflict && (
        <Button
          secondary
          language="ja"
          label="最新の条件を読み込む"
          onPress={() => {
            discard.current = true;
            setRetry((x) => x + 1);
          }}
        />
      )}
      <ScreenFooter>
        <Button
          language="ja"
          label={origin === "onboarding" ? "次へ" : "保存する"}
          loading={status === "saving"}
          disabled={
            status !== "ready" ||
            conflict ||
            !selection.genderPref ||
            !selection.ageGroups.length
          }
          onPress={() => void save()}
        />
      </ScreenFooter>
    </Screen>
  );
}
const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm },
});
