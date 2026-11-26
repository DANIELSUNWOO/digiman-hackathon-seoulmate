import { CaretLeft } from "phosphor-react-native";
import { Pressable, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { strings } from "./strings";

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.back}
      onPress={onPress}
      style={styles.button}
    >
      <CaretLeft size={theme.size.icon} color={theme.color.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    justifyContent: "center",
  },
});
