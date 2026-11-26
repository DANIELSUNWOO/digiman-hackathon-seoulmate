// 홈에 두는 알림 진입 버튼과 안 읽음 배지.
import { Bell } from "phosphor-react-native";
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { notificationsApi, type NotificationsApi } from "./api";
import { badgeLabel } from "./model";
import { strings } from "./strings";
import type { NotificationLang } from "./types";
import { useUnreadCount } from "./useUnreadCount";

export interface NotificationBellProps {
  api?: NotificationsApi;
  lang: NotificationLang;
  onPress: () => void;
}

export function NotificationBell({
  api = notificationsApi,
  lang,
  onPress,
}: NotificationBellProps): ReactElement {
  const badge = badgeLabel(useUnreadCount(api));
  const { title, unread } = strings[lang];
  const fontFamily = `NotoSans${lang === "ko" ? "KR" : "JP"}_700Bold`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        badge === null ? title : `${title}, ${unread} ${badge}`
      }
      onPress={onPress}
      style={styles.button}
    >
      <Bell size={theme.size.icon} color={theme.color.text} />
      {badge !== null && (
        <View style={styles.badge}>
          <Text style={[styles.count, { fontFamily }]}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 0,
    // 아이콘 가운데에서 시작해, "99+"처럼 길어져도 종을 가리지 않고 오른쪽으로 늘어난다.
    left: theme.size.touchMin / 2,
    minWidth: theme.size.iconInline,
    paddingHorizontal: theme.space.xs,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    backgroundColor: theme.color.orange,
  },
  count: {
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    color: theme.color.text,
  },
});
