// 상대 프로필 사진. 앨범과 메이트 홈이 함께 쓴다.
import { User } from "phosphor-react-native";
import { useState, type ReactElement } from "react";
import { Image, StyleSheet, View } from "react-native";
import { theme } from "../../theme";

export interface AvatarProps {
  url: string | null;
  /** 지름. 기본은 목록 카드 크기 */
  size?: number;
  /** 이름이 옆에 글자로 없을 때 읽어 줄 말 */
  label?: string;
}

/** 사진이 없거나 못 읽으면 사람 아이콘을 보여 준다. */
export function Avatar(props: AvatarProps): ReactElement {
  // 주소가 바뀌면 이전의 실패를 잊는다.
  return <AvatarImage key={props.url ?? ""} {...props} />;
}

function AvatarImage({
  url,
  size = theme.size.avatar,
  label,
}: AvatarProps): ReactElement {
  const [failed, setFailed] = useState(false);
  const frame = { width: size, height: size, borderRadius: theme.radius.pill };
  if (url && !failed)
    return (
      <Image
        source={{ uri: url }}
        accessibilityLabel={label}
        onError={() => setFailed(true)}
        style={frame}
      />
    );
  const iconSize =
    size >= theme.size.touchMin ? theme.size.iconSmall : theme.size.iconInline;
  return (
    <View accessibilityLabel={label} style={[frame, styles.empty]}>
      <User size={iconSize} color={theme.color.brandDeep} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.brandTint,
  },
});
