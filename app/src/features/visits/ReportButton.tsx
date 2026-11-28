import type { ReactElement } from "react";
import { Pressable, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import type { ViewerLang } from "../translation";
import { strings } from "./strings";
import type { ReportTarget } from "./types";

export interface ReportButtonProps {
  target: ReportTarget;
  lang: ViewerLang;
  /** 신고 화면(클라 P)이 연결되기 전에는 없다. 그때는 버튼을 그리지 않는다. */
  onReport?: (target: ReportTarget) => void;
}

export function ReportButton({
  target,
  lang,
  onReport,
}: ReportButtonProps): ReactElement | null {
  if (!onReport) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onReport(target)}
      style={styles.button}
    >
      <Label language={lang}>{strings[lang].report}</Label>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: theme.size.touchMin,
    alignSelf: "flex-end",
    justifyContent: "center",
  },
});
