// M-20 위치 안내. X로 닫으면 이 기기에서 다시 보여 주지 않는다.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { X } from "phosphor-react-native";
import { useEffect, useState, type ReactElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Notice } from "../../ui";
import { strings } from "./strings";

const CLOSED_KEY = "mateHome.locationNoticeClosed";

export function LocationNotice(): ReactElement | null {
  // 저장값을 읽기 전에는 그리지 않아 닫은 안내가 깜빡이지 않는다.
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(CLOSED_KEY).then(
      (value) => {
        if (active) setIsOpen(value === null);
      },
      // 읽지 못하면 안내를 보여 주는 쪽을 택한다.
      () => {
        if (active) setIsOpen(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  if (!isOpen) return null;
  const close = () => {
    setIsOpen(false);
    // 저장에 실패하면 다음에 한 번 더 보일 뿐이라 알리지 않는다.
    AsyncStorage.setItem(CLOSED_KEY, "1").catch(() => {});
  };
  return (
    <View style={styles.row}>
      <View style={styles.notice}>
        <Notice language="ko">{strings.locationNotice}</Notice>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.closeNotice}
        onPress={close}
        style={styles.close}
      >
        <X size={theme.size.iconSmall} color={theme.color.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: theme.space.xs },
  notice: { flex: 1 },
  close: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
});
