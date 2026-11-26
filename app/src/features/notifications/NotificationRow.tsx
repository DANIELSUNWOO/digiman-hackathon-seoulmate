import {
  Bell,
  ChatCircle,
  ChatCircleDots,
  Heart,
  Hourglass,
  Images,
  MapPin,
  UserPlus,
  XCircle,
  type Icon,
} from "phosphor-react-native";
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import { timeLabel } from "./model";
import { strings } from "./strings";
import type { NotificationItem, NotificationLang } from "./types";

// 서버는 CHAT_REQUEST를, API 명세 v1.7은 CHAT_READY를 쓴다.
const ICONS = new Map<string, Icon>([
  ["MATCHED", UserPlus],
  ["CANCELED", XCircle],
  ["VISIT", MapPin],
  ["REACTION", Heart],
  ["CHAT_REQUEST", ChatCircleDots],
  ["CHAT_READY", ChatCircleDots],
  ["CHAT_OPEN", ChatCircle],
  ["EXPIRED", Hourglass],
  ["COMPLETED", Images],
]);

export interface NotificationRowProps {
  item: NotificationItem;
  lang: NotificationLang;
  onPress: (item: NotificationItem) => void;
}

export function NotificationRow({
  item,
  lang,
  onPress,
}: NotificationRowProps): ReactElement {
  const TypeIcon = ICONS.get(item.type) ?? Bell;
  const time = timeLabel(item.createdAt);
  const fontFamily = `NotoSans${lang === "ko" ? "KR" : "JP"}_400Regular`;
  const status = item.isRead ? "" : `${strings[lang].unread}, `;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${status}${item.message}, ${time}`}
      onPress={() => onPress(item)}
      style={[styles.row, !item.isRead && styles.unread]}
    >
      <TypeIcon size={theme.size.icon} color={theme.color.text} />
      <View style={styles.body}>
        <Label language={lang} weight={item.isRead ? "regular" : "bold"}>
          {item.message}
        </Label>
        <Text style={[styles.time, { fontFamily }]}>{time}</Text>
      </View>
      {!item.isRead && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.space.md,
    padding: theme.space.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.white,
  },
  unread: { backgroundColor: theme.color.mainSoft },
  body: { flex: 1, gap: theme.space.xs },
  time: {
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    color: theme.color.muted,
  },
  dot: {
    width: theme.space.sm,
    height: theme.space.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.orange,
  },
});
