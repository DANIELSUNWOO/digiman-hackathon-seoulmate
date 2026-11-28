import { User } from "phosphor-react-native";
import { useState, type ReactElement } from "react";
import { Image, StyleSheet, View } from "react-native";
import { theme } from "../../theme";

const SIZE = 28;

export interface AvatarProps {
  url: string | null;
  name: string;
}

/** 사진이 없거나 못 읽으면 사람 아이콘을 보여 준다. */
export function Avatar({ url, name }: AvatarProps): ReactElement {
  const [failed, setFailed] = useState(false);
  if (url && !failed)
    return (
      <Image
        source={{ uri: url }}
        accessibilityLabel={name}
        onError={() => setFailed(true)}
        style={styles.avatar}
      />
    );
  return (
    <View accessibilityLabel={name} style={[styles.avatar, styles.empty]}>
      <User size={theme.size.iconInline} color={theme.color.brandDeep} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: SIZE, height: SIZE, borderRadius: theme.radius.pill },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.brandTint,
  },
});
