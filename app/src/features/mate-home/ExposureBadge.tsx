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
    ...theme.typography.caption1Bold,
    fontFamily: "NotoSansKR_700Bold",
    color: theme.color.muted,
  },
  textPublic: { color: theme.color.tealInk },
});
