import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { strings } from "./strings";

export function ExposureBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <View style={[styles.badge, isPublic && styles.badgePublic]}>
      <Text style={[styles.text, isPublic && styles.textPublic]}>
        {isPublic ? strings.exposed : strings.hidden}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    marginBottom: theme.space.sm,
    backgroundColor: theme.color.background,
  },
  badgePublic: { backgroundColor: theme.color.tealSoft },
  text: {
    // 커스텀 Bold 폰트에 fontWeight가 겹치지 않게 크기와 줄 높이만 쓴다.
    fontSize: theme.typography.caption1Bold.fontSize,
    lineHeight: theme.typography.caption1Bold.lineHeight,
    fontFamily: "NotoSansKR_700Bold",
    color: theme.color.muted,
  },
  textPublic: { color: theme.color.tealInk },
});
