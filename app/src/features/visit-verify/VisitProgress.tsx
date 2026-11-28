// 인증 진행 막대. 채팅이 열리는 지점에 자물쇠를 두고, 도달하면 연다.
import { LockSimpleIcon, LockSimpleOpenIcon } from "phosphor-react-native";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import { progressView } from "./progress";
import { strings } from "./strings";
import type { Progress } from "./types";

// 11/28 디자인: 인증 완료 화면의 막대 두께는 12px이다.
const BAR_HEIGHT = 12;
const COURSE_BAR_HEIGHT = 8;
const MARKER_SIZE = 28;

export interface VisitProgressProps {
  progress: Progress;
  variant?: "complete" | "course";
}

export function VisitProgress({
  progress,
  variant = "complete",
}: VisitProgressProps): ReactElement {
  const barHeight = variant === "course" ? COURSE_BAR_HEIGHT : BAR_HEIGHT;
  const { visited, total } = progress;
  const { ratio, chatAt, remaining } = progressView(progress);
  const title = strings.progress(visited, total);
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Label language="ja" weight="bold">
          {title}
        </Label>
        {remaining !== null && (
          <Label language="ja" variant="caption">
            {remaining > 0 ? strings.chatRemaining(remaining) : strings.chatOk}
          </Label>
        )}
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={title}
        // accessibilityValue는 웹에 전달되지 않는다.
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={visited}
        style={styles.bar}
      >
        <View style={[styles.track, { height: barHeight }]}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
        {chatAt !== null && <ChatMarker at={chatAt} open={remaining === 0} />}
      </View>
    </View>
  );
}

function ChatMarker({ at, open }: { at: number; open: boolean }): ReactElement {
  const Icon = open ? LockSimpleOpenIcon : LockSimpleIcon;
  return (
    <View
      style={[
        styles.marker,
        open && styles.markerOpen,
        { left: `${at * 100}%` },
      ]}
    >
      <Icon
        size={theme.size.iconInline}
        color={open ? theme.color.surface : theme.color.muted}
        weight="fill"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: theme.space.sm },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.space.sm,
    flexWrap: "wrap",
  },
  // 자물쇠가 막대보다 커서 위아래 자리를 마련한다.
  bar: { height: MARKER_SIZE, justifyContent: "center" },
  track: {
    height: BAR_HEIGHT,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface2,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: theme.color.accent },
  marker: {
    position: "absolute",
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    marginLeft: -MARKER_SIZE / 2,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.surface,
    borderWidth: 2,
    borderColor: theme.color.surface2,
  },
  markerOpen: {
    backgroundColor: theme.color.brand,
    borderColor: theme.color.brand,
  },
});
