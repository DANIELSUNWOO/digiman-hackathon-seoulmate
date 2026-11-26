import React from "react";
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme as t } from "./theme";
import { useRole } from "./state";
function useFontFamily(
  weight: "regular" | "medium" | "bold",
  language?: "ko" | "ja",
) {
  const { role } = useRole();
  const prefix = (language ? language === "ko" : role === "mate")
    ? "NotoSansKR"
    : "NotoSansJP";
  const suffix =
    weight === "bold"
      ? "700Bold"
      : weight === "medium"
        ? "500Medium"
        : "400Regular";
  return `${prefix}_${suffix}`;
}

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Label({
  children,
  title = false,
  center = false,
  language,
  logo = false,
  weight,
  selected = false,
}: {
  children: React.ReactNode;
  title?: boolean;
  center?: boolean;
  language?: "ko" | "ja";
  logo?: boolean;
  weight?: "regular" | "medium" | "bold";
  selected?: boolean;
}) {
  const fontFamily = useFontFamily(
    weight ?? (title ? "bold" : "regular"),
    language,
  );
  return (
    <Text
      style={[
        s.text,
        { fontFamily },
        title && s.title,
        logo && {
          fontFamily: "LineSeedKR",
          fontSize: t.typography.logoKr.fontSize,
          lineHeight: t.typography.logoKr.lineHeight,
        },
        selected && { color: t.color.orangeInk },
        center && s.center,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
  language,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  secondary?: boolean;
  language?: "ko" | "ja";
}) {
  const fontFamily = useFontFamily("bold", language);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, disabled && s.disabled]}
    >
      <Text
        style={[
          s.buttonText,
          { fontFamily },
          disabled && { color: t.color.muted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  selected,
  onPress,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.card, selected && s.selected]}
    >
      {children}
    </Pressable>
  );
}
export function Input({
  language,
  ...props
}: TextInputProps & { language?: "ko" | "ja" }) {
  const fontFamily = useFontFamily("regular", language);
  return (
    <TextInput
      placeholderTextColor={t.color.placeholder}
      {...props}
      style={[s.input, { fontFamily }, props.style]}
    />
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const fontFamily = useFontFamily(selected ? "bold" : "regular");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected && s.chipSelected]}
    >
      <Text
        style={[
          s.chipText,
          { fontFamily },
          selected && { color: t.color.orangeInk },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { role } = useRole();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.overlay}
      >
        <Pressable
          style={s.scrim}
          accessibilityRole="button"
          accessibilityLabel={role === "mate" ? "닫기" : "閉じる"}
          onPress={onClose}
        />
        <SafeAreaView edges={["bottom"]} style={s.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.color.white },
  content: { flexGrow: 1, padding: t.space.screen, gap: t.space.lg },
  text: { fontSize: t.type.body, lineHeight: 24, color: t.color.text },
  title: { fontSize: t.type.title, lineHeight: 30 },
  center: { textAlign: "center" },
  button: {
    minHeight: t.size.button,
    minWidth: t.size.touchMin,
    borderRadius: t.radius.card,
    backgroundColor: t.color.main,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  secondary: {
    backgroundColor: t.color.white,
    borderColor: t.color.border,
    borderWidth: 1,
  },
  disabled: { backgroundColor: t.color.border },
  buttonText: {
    fontSize: 15,
    color: t.color.text,
    textAlign: "center",
  },
  card: {
    borderWidth: 1.5,
    borderColor: t.color.border,
    borderRadius: t.radius.card,
    padding: 16,
    minHeight: t.size.touchMin,
    minWidth: t.size.touchMin,
    backgroundColor: t.color.white,
  },
  selected: { borderColor: t.color.orange, backgroundColor: t.color.mainSoft },
  input: {
    minHeight: t.size.touchMin,
    minWidth: t.size.touchMin,
    backgroundColor: t.color.background,
    borderWidth: 1,
    borderColor: t.color.border,
    borderRadius: t.radius.input,
    padding: 14,
    color: t.color.text,
    fontSize: 14,
  },
  chip: {
    borderWidth: 1,
    borderColor: t.color.border,
    borderRadius: t.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: t.size.touchMin,
    minWidth: t.size.touchMin,
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: t.color.orange,
    backgroundColor: t.color.orangeSoft,
  },
  chipText: {
    fontSize: t.typography.caption1.fontSize,
    lineHeight: t.typography.caption1.lineHeight,
    color: t.color.text,
    textAlign: "center",
  },
  overlay: { flex: 1, justifyContent: "flex-end" },
  scrim: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: t.color.dim,
  },
  sheet: {
    maxHeight: "85%",
    backgroundColor: t.color.white,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    padding: 20,
  },
});
