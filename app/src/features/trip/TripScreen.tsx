import { LoadingSkeleton } from "../../loading";
import { useOnboardingBackHandler } from "../onboarding/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { CaretLeft, CaretRight } from "phosphor-react-native";
import {
  AppBar,
  Button,
  ErrorNotice,
  Label,
  ProgressTracker,
  Screen,
  ScreenFooter,
} from "../../ui";
import { theme as t } from "../../theme";
import {
  syncTripDraftAccount,
  getTripDraft,
  setTripDraft,
  clearTripDraft,
} from "./draft";
import {
  datesOf,
  monthDays,
  monthShift,
  nightsBetween,
  selectDay,
  type Selection,
} from "./calendar";
import { sameTrip, seoulToday, validateDates, type Trip } from "./model";
import { createTripSaveFlow, type TripSaveResult } from "./saveFlow";
import type { TripRequest } from "./api";

const steps = ["本人確認", "基本情報", "好み", "条件", "日程"];
const weekdays = ["月", "火", "水", "木", "金", "土", "日"];
export type TripScreenProps = {
  userId: string;
  token: string;
  origin: "onboarding" | "account";
  isCurrentAccount: () => boolean;
  refresh: () => Promise<boolean>;
  onDone: (origin: "onboarding" | "account") => void;
  onBack: () => void;
  request?: TripRequest;
  now?: () => Date;
};
export function TripScreen(props: TripScreenProps) {
  const {
    userId,
    token,
    origin,
    isCurrentAccount,
    refresh,
    onDone,
    onBack,
    request,
    now,
  } = props;
  const [today, setToday] = useState(() => seoulToday(now?.()));
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selection, setSelection] = useState<Selection>({
    startDate: "",
    endDate: "",
    selecting: "start",
  });
  const [original, setOriginal] = useState<Trip | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "saving"
  >("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [conflict, setConflict] = useState(false);
  const forceReload = useRef(false);
  const clock = useRef(now);
  clock.current = now;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const current = clock.current?.() ?? new Date();
      setToday(seoulToday(current));
      clearTimeout(timer);
      const untilMidnight =
        86400000 - ((current.getTime() + 9 * 3600000) % 86400000);
      timer = setTimeout(update, untilMidnight + 20);
    };
    update();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") update();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);
  const attempt = useRef(0),
    mounted = useRef(false),
    busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const live = useRef(isCurrentAccount);
  live.current = isCurrentAccount;
  const callbacks = useRef({ refresh, onDone, onBack });
  callbacks.current = { refresh, onDone, onBack };
  const active = (n: number, signal: AbortSignal) =>
    mounted.current &&
    attempt.current === n &&
    !signal.aborted &&
    live.current();
  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      syncTripDraftAccount(userId);
      busy.current = false;
      const n = ++attempt.current;
      const c = new AbortController();
      controller.current = c;
      const flow = createTripSaveFlow({
        token,
        signal: c.signal,
        request,
        isCurrentAccount: () => active(n, c.signal),
      });
      setStatus("loading");
      setMessage("");
      void flow
        .load()
        .then((value) => {
          if (!active(n, c.signal)) return;
          const saved = getTripDraft(userId);
          const changed = !!saved && !sameTrip(saved.original, value);
          const keep = saved && !forceReload.current;
          const next: Selection = keep
            ? saved.selection
            : value
              ? {
                  startDate: value.startDate,
                  endDate: value.endDate,
                  selecting: "end",
                }
              : { startDate: "", endDate: "", selecting: "start" };
          const baseline = keep ? saved.original : value;
          forceReload.current = false;
          setOriginal(baseline);
          setSelection(next);
          setConflict(changed && !!keep);
          if (value && !keep)
            setMonth(
              value.startDate.slice(0, 7) < today.slice(0, 7)
                ? today.slice(0, 7)
                : value.startDate.slice(0, 7),
            );
          if (changed && keep)
            setMessage(
              "日程が変更されました。入力は保持しています。最新の日程を読み込むと入力は置き換わります。",
            );
          setTripDraft(userId, { original: baseline, selection: next });
          setStatus("ready");
        })
        .catch(() => {
          if (active(n, c.signal)) {
            setStatus("error");
            setMessage("日程を読み込めませんでした。もう一度お試しください。");
          }
        });
      return () => {
        mounted.current = false;
        attempt.current++;
        c.abort();
        controller.current?.abort();
        busy.current = false;
      };
    }, [userId, token, request, retry]),
  );
  function back() {
    attempt.current++;
    controller.current?.abort();
    busy.current = false;
    callbacks.current.onBack();
    return true;
  }
  useOnboardingBackHandler(back);
  function change(next: Selection) {
    if (status !== "ready") return;
    setSelection(next);
    setTripDraft(userId, { original, selection: next });
  }
  async function save() {
    const currentToday = seoulToday(clock.current?.());
    setToday(currentToday);
    if (
      conflict ||
      busy.current ||
      status !== "ready" ||
      !validateDates(datesOf(selection), currentToday, original)
    )
      return;
    busy.current = true;
    setStatus("saving");
    setMessage("");
    const n = ++attempt.current;
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    const flow = createTripSaveFlow({
      token,
      signal: c.signal,
      request,
      isCurrentAccount: () => active(n, c.signal),
    });
    try {
      const result: TripSaveResult = await flow.save(
        original,
        datesOf(selection),
        currentToday,
      );
      if (!active(n, c.signal)) return;
      if (result.kind === "saved") {
        setTripDraft(userId, { original: result.trip, selection });
        setOriginal(result.trip);
        const ok = await callbacks.current.refresh();
        if (!active(n, c.signal)) return;
        if (!ok) {
          setMessage(
            "保存しましたが、状態を確認できませんでした。もう一度お試しください。",
          );
          return;
        }
        clearTripDraft(userId);
        callbacks.current.onDone(origin);
        return;
      }
      if (result.kind === "conflict") {
        setConflict(true);
        setMessage(
          "別の画面で日程が変更されました。再読み込みして確認してください。",
        );
      } else if (result.kind === "unconfirmed")
        setMessage(
          "保存結果を確認できませんでした。再読み込みして確認してください。",
        );
      else if (result.kind === "invalid")
        setMessage("日付を確認してください。");
    } catch {
      if (active(n, c.signal))
        setMessage("保存できませんでした。もう一度お試しください。");
    } finally {
      if (active(n, c.signal)) {
        busy.current = false;
        setStatus("ready");
      }
    }
  }
  const locked = status !== "ready";
  return (
    <Screen>
      <AppBar language="ja" onBack={back} />
      <ProgressTracker steps={steps} currentIndex={4} language="ja" />
      <Label title language="ja">
        いつソウルに来ますか？
      </Label>
      <Label tone="desc" language="ja">
        出発日と帰国日を順番にタップしてください。
      </Label>
      {status === "loading" ? (
        <LoadingSkeleton shape="calendar" label="日程を読み込み中" />
      ) : status === "error" ? (
        <Button
          language="ja"
          secondary
          label="再読み込み"
          onPress={() => {
            forceReload.current = true;
            setRetry((x) => x + 1);
          }}
        />
      ) : (
        <>
          <View style={s.row}>
            {(["start", "end"] as const).map((key) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  key === "start" ? "出発日を選ぶ" : "帰国日を選ぶ"
                }
                key={key}
                onPress={() => change({ ...selection, selecting: key })}
                style={[s.card, selection.selecting === key && s.activeCard]}
              >
                <Label variant="caption" tone="desc" language="ja">
                  {key === "start" ? "出発" : "帰国"}
                </Label>
                <Label weight="bold" language="ja">
                  {(key === "start"
                    ? selection.startDate
                    : selection.endDate) || "未選択"}
                </Label>
              </Pressable>
            ))}
          </View>
          <View style={s.row}>
            {[0, 1, 2].map((i) => {
              const target = monthShift(today.slice(0, 7), i);
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  onPress={() => setMonth(target)}
                  style={[s.chip, month === target && s.chipActive]}
                >
                  <Text
                    style={{
                      fontFamily: "NotoSansJP_500Medium",
                      fontSize: 13,
                      color:
                        month === target
                          ? t.color.surface
                          : t.color.labelNeutral,
                    }}
                  >
                    {["今月", "来月", "再来月"][i]} {Number(target.slice(5))}月
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.nav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="前の月"
              style={s.navButton}
              disabled={month <= today.slice(0, 7)}
              onPress={() => setMonth(monthShift(month, -1))}
            >
              <CaretLeft size={20} color={t.color.labelNormal} />
            </Pressable>
            <Label weight="bold" language="ja">
              {Number(month.slice(0, 4))}年{Number(month.slice(5))}月
            </Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="次の月"
              style={s.navButton}
              onPress={() => setMonth(monthShift(month, 1))}
            >
              <CaretRight size={20} color={t.color.labelNormal} />
            </Pressable>
          </View>
          <View style={s.grid}>
            {weekdays.map((d) => (
              <View key={d} style={s.week}>
                <Text style={s.weekText}>{d}</Text>
              </View>
            ))}
            {monthDays(month).map((day, i) => {
              const selected =
                day &&
                (day === selection.startDate || day === selection.endDate);
              const inside =
                day &&
                selection.startDate &&
                selection.endDate &&
                day > selection.startDate &&
                day < selection.endDate;
              return (
                <View key={day ?? `empty${i}`} style={s.cell}>
                  {day && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={day}
                      accessibilityState={{
                        disabled: day < today,
                        selected: !!selected,
                      }}
                      disabled={locked || day < today}
                      onPress={() => change(selectDay(selection, day, today))}
                      style={[
                        s.day,
                        !!inside && s.range,
                        !!selected && s.selected,
                      ]}
                    >
                      <Text
                        style={[
                          s.dayText,
                          day < today && s.past,
                          !!selected && s.selectedText,
                        ]}
                      >
                        {Number(day.slice(8))}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
          {nightsBetween(selection.startDate, selection.endDate) !== null ? (
            <Label center variant="caption" tone="desc" language="ja">
              {nightsBetween(selection.startDate, selection.endDate)}泊
              {nightsBetween(selection.startDate, selection.endDate)! + 1}日
            </Label>
          ) : null}
          {message ? (
            <>
              <ErrorNotice language="ja">{message}</ErrorNotice>
              <Button
                language="ja"
                secondary
                label="再読み込み"
                onPress={() => {
                  forceReload.current = true;
                  setRetry((x) => x + 1);
                }}
              />
            </>
          ) : null}
          <ScreenFooter>
            <Button
              language="ja"
              label={origin === "account" ? "保存" : "はじめる"}
              onPress={save}
              loading={status === "saving"}
              disabled={
                locked ||
                conflict ||
                !validateDates(datesOf(selection), today, original)
              }
            />
          </ScreenFooter>
        </>
      )}
      {status === "error" && message ? (
        <ErrorNotice language="ja">{message}</ErrorNotice>
      ) : null}
    </Screen>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: t.color.lineNormal,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  activeCard: { borderColor: t.color.brandDeep },
  chip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: t.color.chipLine,
    borderRadius: 999,
    minHeight: 40,
  },
  chipActive: {
    backgroundColor: t.color.brandDeep,
    borderColor: t.color.brandDeep,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  week: { width: "14.285714%", alignItems: "center", paddingVertical: 4 },
  weekText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: t.color.labelDesc,
  },
  cell: { width: "14.285714%", height: 44 },
  day: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  range: { backgroundColor: t.color.brandSoft, borderRadius: 0 },
  selected: { backgroundColor: t.color.brandDeep },
  dayText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: t.color.labelNormal,
  },
  past: { color: t.color.labelDisable },
  selectedText: { color: t.color.surface, fontFamily: "NotoSansJP_700Bold" },
});
