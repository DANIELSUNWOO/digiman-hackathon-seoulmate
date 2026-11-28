import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CaretRight,
  Check,
  CheckCircle,
  Prohibit,
  ShieldWarning,
  WarningCircle,
} from "phosphor-react-native";
import {
  BottomSheet,
  Button,
  ErrorNotice,
  Input,
  Label,
  useFontFamily,
} from "../../ui";
import { theme } from "../../theme";
import { reasons, validateReason, type ReportTarget } from "./model";
import { SafetyController, type SafetyResult } from "./controller";

const names = {
  ko: [
    "폭언과 괴롭힘",
    "연락처 요구",
    "만남 강요",
    "성적인 언행",
    "스팸",
    "기타",
  ],
  ja: [
    "暴言や嫌がらせ",
    "連絡先の要求",
    "面会の強要",
    "性的な言動",
    "スパム",
    "その他",
  ],
};

export type SafetySheetProps = {
  visible: boolean;
  active: boolean;
  accountId: string;
  token: string;
  matchId: number;
  partnerId: string;
  language: "ko" | "ja";
  target: ReportTarget;
  controller: SafetyController;
  onClose: () => void;
  onDismissed: () => void;
  onBlocked: () => void;
  onBlockUncertain: () => void;
};

export function SafetySheet(props: SafetySheetProps) {
  const [step, setStep] = useState<"menu" | "reason" | "confirm" | "result">(
    "menu",
  );
  const [mode, setMode] = useState<"report" | "block">("report");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [retryUncertain, setRetryUncertain] = useState(false);
  const busyRef = useRef(false);
  const closeRequested = useRef(false);
  const live = useRef(props);
  live.current = props;
  const scope = JSON.stringify([
    props.accountId,
    props.token,
    props.matchId,
    props.partnerId,
  ]);
  const revision = useRef(0);
  const lastScope = useRef(scope);
  if (lastScope.current !== scope) {
    lastScope.current = scope;
    revision.current++;
  }
  useEffect(() => {
    if (!props.active) revision.current++;
  }, [props.active]);
  useEffect(() => {
    if (props.visible) {
      closeRequested.current = false;
      setStep(props.target.type === "CHAT" ? "reason" : "menu");
      setMode("report");
      setReason("");
      setDetail("");
      setResult(null);
      setRetryUncertain(false);
    }
  }, [props.visible, scope, props.target.type, props.target.id]);

  const ko = props.language === "ko";
  const regularFont = useFontFamily("regular", props.language);
  const semiboldFont = useFontFamily("semibold", props.language);
  const boldFont = useFontFamily("bold", props.language);
  const renderedRevision = revision.current;

  const close = () => {
    if (
      closeRequested.current ||
      !live.current.visible ||
      renderedRevision !== revision.current ||
      scope !== lastScope.current ||
      live.current.controller !== props.controller
    )
      return;
    closeRequested.current = true;
    revision.current++;
    props.controller.invalidate();
    props.onClose();
  };
  const choose = (next: "report" | "block") => {
    setMode(next);
    setReason("");
    setDetail("");
    setStep("reason");
  };

  let valid = false;
  try {
    validateReason(reason, detail);
    valid = true;
  } catch {
    /* incomplete choice */
  }

  const submit = async () => {
    if (
      busyRef.current ||
      renderedRevision !== revision.current ||
      !live.current.active ||
      !live.current.visible ||
      live.current.controller !== props.controller ||
      scope !== lastScope.current ||
      !valid
    )
      return;
    const captured = revision.current;
    const capturedScope = scope;
    setBusy(true);
    busyRef.current = true;
    if (mode === "block") props.onBlockUncertain();
    const response =
      mode === "report"
        ? await props.controller.report(
            props.accountId,
            props.token,
            props.matchId,
            props.target,
            reason,
            detail,
            retryUncertain,
          )
        : await props.controller.block(
            props.accountId,
            props.token,
            props.matchId,
            props.partnerId,
            reason,
            detail,
          );
    setBusy(false);
    busyRef.current = false;
    if (
      captured !== revision.current ||
      capturedScope !== lastScope.current ||
      !live.current.active ||
      !live.current.visible
    )
      return;
    setResult(response);
    setStep("result");
    if (mode === "block" && response === "success") props.onBlocked();
  };

  const reportUncertain = props.controller.isReportUncertain(
    props.accountId,
    props.matchId,
  );
  const selectedReasonIdx = reasons.indexOf(reason as (typeof reasons)[number]);
  const selectedReasonLabel =
    selectedReasonIdx >= 0 ? names[props.language][selectedReasonIdx] : "";

  return (
    <BottomSheet
      visible={props.visible}
      onClose={close}
      onDismissed={props.onDismissed}
    >
      <View style={styles.sheetBody}>
        {step === "menu" ? (
          <>
            <Label variant="sheetTitle" language={props.language}>
              {ko ? "안전 메뉴" : "安全メニュー"}
            </Label>
            <View style={styles.menuList}>
              <Pressable
                accessibilityRole="button"
                onPress={() => choose("report")}
                style={styles.menuRow}
              >
                <ShieldWarning size={20} color={theme.color.dangerInk} />
                <Text
                  style={[
                    styles.menuRowLabel,
                    styles.menuRowDangerText,
                    { fontFamily: semiboldFont },
                  ]}
                >
                  {ko ? "상대 신고" : "相手を通報"}
                </Text>
                <CaretRight size={16} color={theme.color.labelAssist} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => choose("block")}
                style={styles.menuRow}
              >
                <Prohibit size={20} color={theme.color.labelNeutral} />
                <Text
                  style={[styles.menuRowLabel, { fontFamily: semiboldFont }]}
                >
                  {ko ? "상대 차단" : "相手をブロック"}
                </Text>
                <CaretRight size={16} color={theme.color.labelAssist} />
              </Pressable>
            </View>
          </>
        ) : null}

        {step === "reason" ? (
          <>
            <View style={styles.headerGroup}>
              <Label variant="sheetTitle" language={props.language}>
                {mode === "report"
                  ? ko
                    ? "신고하기"
                    : "通報する"
                  : ko
                    ? "차단하기"
                    : "ブロックする"}
              </Label>
              <Label variant="desc" tone="desc" language={props.language}>
                {ko ? "사유를 선택해 주세요." : "理由を選択してください。"}
              </Label>
            </View>

            <View style={styles.reasonList}>
              {reasons.map((item, index) => {
                const selected = item === reason;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    onPress={() => setReason(item)}
                    style={[
                      styles.selectRow,
                      selected && styles.selectRowSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectRowText,
                        { fontFamily: semiboldFont },
                        selected && styles.selectRowTextSelected,
                      ]}
                    >
                      {names[props.language][index]}
                    </Text>
                    <View
                      style={[
                        styles.radioCircle,
                        selected && styles.radioCircleSelected,
                      ]}
                    >
                      {selected ? (
                        <Check
                          size={12}
                          color={theme.color.surface}
                          weight="bold"
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {reason === "OTHER" ? (
              <View style={styles.detailBox}>
                <Input
                  language={props.language}
                  value={detail}
                  onChangeText={setDetail}
                  maxLength={1000}
                  multiline
                  style={styles.detailInput}
                  placeholder={ko ? "상세 사유" : "詳しい理由"}
                />
                <Text style={[styles.counterText, { fontFamily: regularFont }]}>
                  {`${detail.length}/1000`}
                </Text>
              </View>
            ) : null}

            {reportUncertain && mode === "report" ? (
              <View style={styles.uncertainBox}>
                <ErrorNotice language={props.language}>
                  {ko
                    ? "이전 신고 결과를 확인할 수 없습니다. 다시 보내면 중복될 수 있습니다."
                    : "前回の通報結果を確認できません。再送すると重複する場合があります。"}
                </ErrorNotice>
                <Button
                  secondary
                  size="small"
                  language={props.language}
                  label={
                    retryUncertain
                      ? ko
                        ? "중복 위험 확인함"
                        : "重複リスクを確認済み"
                      : ko
                        ? "중복 위험 확인 후 재시도"
                        : "重複リスクを確認して再送"
                  }
                  onPress={() => setRetryUncertain(true)}
                />
              </View>
            ) : null}

            <Button
              language={props.language}
              label={ko ? "계속" : "次へ"}
              disabled={
                !valid ||
                (mode === "report" && reportUncertain && !retryUncertain)
              }
              onPress={() => setStep("confirm")}
            />
          </>
        ) : null}

        {step === "confirm" ? (
          <>
            <View style={styles.confirmHero}>
              <View
                style={[
                  styles.heroCircle,
                  mode === "block"
                    ? styles.heroCircleDanger
                    : styles.heroCircleBrand,
                ]}
              >
                {mode === "block" ? (
                  <Prohibit size={26} color={theme.color.dangerInk} />
                ) : (
                  <ShieldWarning size={26} color={theme.color.brandDeep} />
                )}
              </View>
              <Text style={[styles.confirmTitle, { fontFamily: boldFont }]}>
                {mode === "report"
                  ? ko
                    ? "신고하기"
                    : "通報する"
                  : ko
                    ? "차단하기"
                    : "ブロックする"}
              </Text>
              <Text style={[styles.confirmDesc, { fontFamily: regularFont }]}>
                {mode === "report"
                  ? retryUncertain
                    ? ko
                      ? "중복 신고가 될 수 있습니다. 다시 보내시겠습니까?"
                      : "重複する場合があります。再送しますか？"
                    : ko
                      ? "선택한 내용으로 신고하시겠습니까?"
                      : "選択した内容で通報しますか？"
                  : ko
                    ? "상대를 차단하시겠습니까? 진행 중인 매칭은 종료됩니다."
                    : "相手をブロックしますか？進行中のマッチングは終了します。"}
              </Text>
              {selectedReasonLabel ? (
                <View style={styles.reasonSummaryPill}>
                  <Text
                    style={[
                      styles.reasonSummaryText,
                      { fontFamily: semiboldFont },
                    ]}
                  >
                    {selectedReasonLabel}
                  </Text>
                </View>
              ) : null}
            </View>
            <Button
              language={props.language}
              danger={mode === "block"}
              loading={busy}
              disabled={busy}
              label={
                mode === "report"
                  ? ko
                    ? "신고 확인"
                    : "通報を確定"
                  : ko
                    ? "차단 확인"
                    : "ブロックを確定"
              }
              onPress={() => void submit()}
            />
          </>
        ) : null}

        {step === "result" ? (
          <View style={styles.confirmHero}>
            <View
              style={[
                styles.heroCircle,
                result === "success"
                  ? styles.heroCirclePositive
                  : styles.heroCircleDanger,
              ]}
            >
              {result === "success" ? (
                <CheckCircle size={28} color={theme.color.positive} />
              ) : (
                <WarningCircle size={28} color={theme.color.dangerInk} />
              )}
            </View>
            <Text style={[styles.confirmTitle, { fontFamily: boldFont }]}>
              {mode === "report"
                ? ko
                  ? "신고하기"
                  : "通報する"
                : ko
                  ? "차단하기"
                  : "ブロックする"}
            </Text>
            <Text style={[styles.confirmDesc, { fontFamily: regularFont }]}>
              {result === "success"
                ? ko
                  ? "처리되었습니다."
                  : "処理しました。"
                : result === "already"
                  ? ko
                    ? "이미 신고했거나 서버 오류일 수 있어 접수 여부를 확인할 수 없습니다."
                    : "通報済みかサーバーエラーの可能性があり、受付を確認できません。"
                  : result === "uncertain" || result === "busy"
                    ? ko
                      ? "결과를 확인하지 못했습니다. 중복 요청을 막기 위해 자동으로 다시 보내지 않습니다."
                      : "結果を確認できませんでした。重複を防ぐため自動で再送しません。"
                    : ko
                      ? "처리하지 못했습니다. 다시 확인해 주세요."
                      : "処理できませんでした。もう一度確認してください。"}
            </Text>
          </View>
        ) : null}

        <Button
          secondary
          size="pair"
          language={props.language}
          label={ko ? "닫기" : "閉じる"}
          onPress={close}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    gap: 12,
  },
  headerGroup: {
    gap: 4,
  },
  menuList: {
    gap: 8,
  },
  menuRow: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: theme.color.surface2,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: theme.color.labelNormal,
  },
  menuRowDangerText: {
    color: theme.color.dangerInk,
  },
  reasonList: {
    gap: 8,
  },
  selectRow: {
    borderRadius: 12,
    backgroundColor: theme.color.surface2,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectRowSelected: {
    backgroundColor: theme.color.brandTint,
  },
  selectRowText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: theme.color.labelNormal,
  },
  selectRowTextSelected: {
    color: theme.color.brandDeep,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.grey300,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    backgroundColor: theme.color.brandDeep,
  },
  detailBox: {
    gap: 4,
  },
  detailInput: {
    minHeight: 84,
  },
  counterText: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.color.labelDesc,
    textAlign: "right",
  },
  uncertainBox: {
    gap: 8,
  },
  confirmHero: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  heroCircle: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCircleDanger: {
    backgroundColor: theme.color.dangerSoft,
  },
  heroCircleBrand: {
    backgroundColor: theme.color.brandTint,
  },
  heroCirclePositive: {
    backgroundColor: theme.color.positiveWeak,
  },
  confirmTitle: {
    ...theme.typography.sheetTitle,
    color: theme.color.labelNormal,
    textAlign: "center",
  },
  confirmDesc: {
    ...theme.typography.body1,
    color: theme.color.labelDesc,
    textAlign: "center",
  },
  reasonSummaryPill: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface2,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reasonSummaryText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.color.labelNeutral,
  },
});
