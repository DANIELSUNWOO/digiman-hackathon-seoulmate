// 여행자 프로필 사진. 앨범의 Avatar(#56)가 머지되면 하나로 합친다.
import { User } from "phosphor-react-native";
import { useState, type ReactElement } from "react";
import { Image, StyleSheet, View } from "react-native";
import { theme } from "../../theme";

export interface TravelerAvatarProps {
  url: string | null;
}

/** 사진이 없거나 못 읽으면 사람 아이콘을 보여 준다. 이름은 옆에 글자로 있다. */
export function TravelerAvatar({ url }: TravelerAvatarProps): ReactElement {
  const [failed, setFailed] = useState(false);
  if (url && !failed)
    return (
      <Image
        source={{ uri: url }}
        onError={() => setFailed(true)}
        style={styles.avatar}
      />
    );
  return (
    <View style={[styles.avatar, styles.empty]}>
      <User size={theme.size.iconSmall} color={theme.color.brandDeep} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: theme.size.avatar,
    height: theme.size.avatar,
    borderRadius: theme.radius.pill,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.brandTint,
  },
});
