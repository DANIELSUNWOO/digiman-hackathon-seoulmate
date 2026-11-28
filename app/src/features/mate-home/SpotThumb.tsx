// 스팟의 첫 사진과 순서 번호. 미리 공개하는 스팟은 번호를 파랗게 보여 준다.
import { MapPin } from "phosphor-react-native";
import { useState, type ReactElement } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { useFontFamily } from "../../ui";

export interface SpotThumbProps {
  url: string | undefined;
  order: number;
  isPreview: boolean;
}

export function SpotThumb({
  url,
  order,
  isPreview,
}: SpotThumbProps): ReactElement {
  const fontFamily = useFontFamily("bold", "ko");
  return (
    <View>
      <Photo key={url ?? ""} url={url} />
      <View style={[styles.badge, isPreview && styles.badgeOn]}>
        <Text
          style={[styles.order, isPreview && styles.orderOn, { fontFamily }]}
        >
          {order}
        </Text>
      </View>
    </View>
  );
}

/** 사진이 없거나 못 읽으면 핀 아이콘을 보여 준다. */
function Photo({ url }: { url: string | undefined }): ReactElement {
  const [failed, setFailed] = useState(false);
  if (url && !failed)
    return (
      <Image
        source={{ uri: url }}
        onError={() => setFailed(true)}
        style={styles.photo}
      />
    );
  return (
    <View style={[styles.photo, styles.empty]}>
      <MapPin size={theme.size.iconSmall} color={theme.color.iconMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: theme.size.thumbnail,
    height: theme.size.thumbnail,
    borderRadius: theme.radius.input,
    backgroundColor: theme.color.surface2,
  },
  empty: { alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -theme.space.xs,
    left: -theme.space.xs,
    minWidth: theme.size.iconSmall,
    height: theme.size.iconSmall,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
    ...theme.shadow.card,
  },
  badgeOn: { backgroundColor: theme.color.brandDeep },
  order: {
    fontSize: theme.typography.status.fontSize,
    lineHeight: theme.typography.status.lineHeight,
    color: theme.color.labelNeutral,
  },
  orderOn: { color: theme.color.surface },
});
