import React, { useEffect, useRef, useState } from "react";
import { CaretLeft, Info, WarningCircle } from "phosphor-react-native";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme as t } from "./theme";
import { useRole } from "./state";

export type FontWeightName = "regular" | "medium" | "semibold" | "bold";

const PRESS_SCALE = 0.98;
const INTERACTION_DURATION_MS = 120;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function"
    ) {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(mql.matches);
      const onChange = (e: MediaQueryListEvent) => {
        if (active) setReduced(e.matches);
      };
      mql.addEventListener?.("change", onChange);
      return () => {
        active = false;
        mql.removeEventListener?.("change", onChange);
      };
    }

    try {
      AccessibilityInfo?.isReduceMotionEnabled?.()
        .then((enabled) => {
          if (active) setReduced(Boolean(enabled));
        })
        .catch(() => {});
      const sub = AccessibilityInfo?.addEventListener?.(
        "reduceMotionChanged",
        (enabled) => {
          if (active) setReduced(Boolean(enabled));
        },
      );
      return () => {
        active = false;
        sub?.remove?.();
      };
    } catch {
      return () => {
        active = false;
      };
    }
  }, []);

  return reduced;
}

export function useFontFamily(weight: FontWeightName, language?: "ko" | "ja") {
  const { role } = useRole();
  const prefix = (language ? language === "ko" : role === "mate")
    ? "NotoSansKR"
    : "NotoSansJP";
  const suffix =
    weight === "bold"
      ? "700Bold"
      : weight === "semibold"
        ? "600SemiBold"
        : weight === "medium"
          ? "500Medium"
          : "400Regular";
  return `${prefix}_${suffix}`;
}

export function Screen({
  children,
  contentStyle,
}: {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        contentContainerStyle={[s.content, contentStyle]}
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
  tone = "normal",
  variant,
}: {
  children: React.ReactNode;
  title?: boolean;
  center?: boolean;
  language?: "ko" | "ja";
  logo?: boolean;
  weight?: FontWeightName;
  selected?: boolean;
  tone?: "normal" | "neutral" | "desc" | "alt" | "assist" | "danger" | "brand";
  variant?:
    "titleBig" | "body1" | "body2" | "desc" | "label" | "caption" | "status";
}) {
  const { role } = useRole();
  const isKo = language ? language === "ko" : role === "mate";
  const defaultWeight: FontWeightName = title
    ? "bold"
    : variant === "label" || variant === "status"
      ? "semibold"
      : variant === "body2"
        ? "medium"
        : "regular";
  const fontFamily = useFontFamily(weight ?? defaultWeight, language);

  const toneColor =
    tone === "neutral"
      ? t.color.labelNeutral
      : tone === "desc"
        ? t.color.labelDesc
        : tone === "alt"
          ? t.color.labelAlt
          : tone === "assist"
            ? t.color.labelAssist
            : tone === "danger"
              ? t.color.dangerPress
              : tone === "brand"
                ? t.color.brandDeep
                : t.color.labelNormal;

  const variantStyle =
    variant === "titleBig"
      ? s.title
      : variant === "body1"
        ? s.body1
        : variant === "body2"
          ? s.body2
          : variant === "desc"
            ? s.desc
            : variant === "label"
              ? s.labelText
              : variant === "caption"
                ? s.captionText
                : variant === "status"
                  ? s.statusText
                  : undefined;

  return (
    <Text
      style={[
        s.text,
        { color: toneColor, fontFamily },
        variantStyle,
        title && s.title,
        logo &&
          (isKo
            ? {
                fontFamily: "Cafe24Ssurround",
                fontSize: t.typography.wordmarkKr.fontSize,
                lineHeight: t.typography.wordmarkKr.lineHeight,
              }
            : {
                fontFamily: "ZenMaruGothic_900Black",
                fontSize: t.typography.wordmarkJp.fontSize,
                lineHeight: t.typography.wordmarkJp.lineHeight,
              }),
        selected && { color: t.color.brandInk },
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
  loading = false,
  secondary = false,
  danger = false,
  language,
  icon,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  danger?: boolean;
  language?: "ko" | "ja";
  icon?: React.ReactNode;
}) {
  const fontFamily = useFontFamily("bold", language);
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;
  const spinnerColor = secondary ? t.color.labelNeutral : t.color.surface;

  function animateScale(toValue: number) {
    Animated.timing(scale, {
      toValue,
      duration: reducedMotion ? 0 : INTERACTION_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={() => {
          if (!isDisabled) animateScale(PRESS_SCALE);
        }}
        onPressOut={() => animateScale(1)}
        style={({ pressed }) => [
          s.button,
          secondary && s.secondary,
          danger && !secondary && s.dangerButton,
          !isDisabled &&
            pressed &&
            (secondary
              ? s.secondaryPressed
              : danger
                ? s.dangerPressed
                : s.primaryPressed),
          isDisabled &&
            (secondary
              ? s.secondaryDisabled
              : danger
                ? s.dangerDisabled
                : s.disabled),
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : (
          icon
        )}
        <Text
          style={[
            s.buttonText,
            { fontFamily },
            secondary && { color: t.color.labelNeutral },
            isDisabled && secondary && { color: t.color.labelDisable },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function Card({
  children,
  selected,
  onPress,
  style,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  function animateScale(toValue: number) {
    Animated.timing(scale, {
      toValue,
      duration: reducedMotion ? 0 : INTERACTION_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }

  if (!onPress) {
    return (
      <View style={[s.card, selected && s.selected, style]}>{children}</View>
    );
  }
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        onPressIn={() => animateScale(PRESS_SCALE)}
        onPressOut={() => animateScale(1)}
        style={[s.card, selected && s.selected, style]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function Input({
  language,
  error = false,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { language?: "ko" | "ja"; error?: boolean }) {
  const fontFamily = useFontFamily("regular", language);
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const disabled = props.editable === false;
  const webInputReset =
    Platform.OS === "web"
      ? ({ outlineStyle: "none" } as unknown as TextStyle)
      : undefined;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused && !disabled ? 1 : 0,
      duration: reducedMotion ? 0 : INTERACTION_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused, disabled, reducedMotion, focusAnim]);

  const animatedBorderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [t.color.lineNormal, t.color.brand],
  });

  return (
    <Animated.View
      style={[
        s.inputWrap,
        disabled && s.inputDisabled,
        {
          borderColor: error
            ? t.color.danger
            : disabled
              ? t.color.lineNormal
              : animatedBorderColor,
        },
      ]}
    >
      <TextInput
        placeholderTextColor={t.color.labelAlt}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          s.inputInner,
          webInputReset,
          { fontFamily },
          disabled && s.inputDisabledText,
          props.style,
        ]}
      />
    </Animated.View>
  );
}

export function Chip({
  label,
  selected,
  disabled = false,
  language,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  language?: "ko" | "ja";
  onPress: () => void;
}) {
  const fontFamily = useFontFamily(selected ? "semibold" : "medium", language);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.chip,
        selected && s.chipSelected,
        disabled && !selected && s.chipDisabled,
      ]}
    >
      <Text
        style={[
          s.chipText,
          { fontFamily },
          selected && { color: t.color.surface },
          disabled && !selected && { color: t.color.labelDisable },
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
          <View style={s.sheetHandle} />
          <ScrollView keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function AppBar({
  title,
  onBack,
  backLabel,
  backDisabled = false,
  language,
  right,
}: {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  language?: "ko" | "ja";
  right?: React.ReactNode;
}) {
  const { role } = useRole();
  const isKo = language ? language === "ko" : role === "mate";
  const fontFamily = useFontFamily("semibold", language);
  return (
    <View style={s.appbar}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? (isKo ? "뒤로" : "戻る")}
          disabled={backDisabled}
          onPress={onBack}
          style={s.appbarBack}
        >
          <CaretLeft size={t.size.icon} color={t.color.labelNormal} />
        </Pressable>
      ) : (
        <View style={s.appbarSpacer} />
      )}
      {title ? (
        <Text numberOfLines={1} style={[s.appbarTitle, { fontFamily }]}>
          {title}
        </Text>
      ) : (
        <View style={s.appbarCenterSpacer} />
      )}
      {right ?? <View style={s.appbarSpacer} />}
    </View>
  );
}

export function Notice({
  children,
  language,
  icon,
}: {
  children: React.ReactNode;
  language?: "ko" | "ja";
  icon?: React.ReactNode;
}) {
  const fontFamily = useFontFamily("regular", language);
  return (
    <View style={s.notice}>
      <View style={s.noticeIcon}>
        {icon ?? <Info size={t.size.iconSmall} color={t.color.brandDeep} />}
      </View>
      <Text style={[s.noticeText, { fontFamily }]}>{children}</Text>
    </View>
  );
}

export function ProgressTracker({
  steps,
  currentIndex,
  language,
}: {
  steps: string[];
  currentIndex: number;
  language?: "ko" | "ja";
}) {
  const regularFont = useFontFamily("regular", language);
  const boldFont = useFontFamily("bold", language);
  return (
    <View style={s.trackerRow} accessibilityRole="progressbar">
      {steps.map((stepLabel, idx) => {
        const done = idx < currentIndex;
        const current = idx === currentIndex;
        return (
          <View key={stepLabel} style={s.trackerItem}>
            {idx > 0 && (
              <View
                style={[
                  s.trackerLineLeft,
                  (done || current) && s.trackerLineActive,
                ]}
              />
            )}
            {idx < steps.length - 1 && (
              <View style={[s.trackerLineRight, done && s.trackerLineActive]} />
            )}
            <View
              style={[
                s.trackerDot,
                done && s.trackerDotDone,
                current && s.trackerDotCurrent,
              ]}
            >
              <Text
                style={[
                  s.trackerNum,
                  { fontFamily: boldFont },
                  (done || current) && { color: t.color.surface },
                ]}
              >
                {done ? "✓" : String(idx + 1)}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={[
                s.trackerLabel,
                { fontFamily: current ? boldFont : regularFont },
                done && { color: t.color.labelAlt },
                current && { color: t.color.labelNormal },
              ]}
            >
              {stepLabel}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function TextLink({
  label,
  onPress,
  disabled = false,
  variant = "link",
  language,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "link" | "quiet";
  language?: "ko" | "ja";
}) {
  const fontFamily = useFontFamily(
    variant === "link" ? "bold" : "regular",
    language,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={s.textLinkHit}
    >
      <Text
        style={[
          variant === "link" ? s.textLink : s.textQuiet,
          { fontFamily },
          disabled && { color: t.color.labelDisable },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ScreenFooter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.screenFooter, style]}>{children}</View>;
}

export function HelperNotice({
  children,
  language,
  icon,
}: {
  children: React.ReactNode;
  language?: "ko" | "ja";
  icon?: React.ReactNode;
}) {
  const fontFamily = useFontFamily("regular", language);
  return (
    <View style={s.helperNotice}>
      <View style={s.helperNoticeIcon}>
        {icon ?? <Info size={14} color={t.color.iconMuted} />}
      </View>
      <Text style={[s.helperNoticeText, { fontFamily }]}>{children}</Text>
    </View>
  );
}

export function ErrorNotice({
  children,
  language,
}: {
  children: React.ReactNode;
  language?: "ko" | "ja";
}) {
  const fontFamily = useFontFamily("medium", language);
  return (
    <View style={s.errorNotice} accessibilityLiveRegion="polite">
      <View style={s.errorNoticeIcon}>
        <WarningCircle size={16} color={t.color.dangerPress} />
      </View>
      <Text style={[s.errorNoticeText, { fontFamily }]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.color.surface },
  content: {
    flexGrow: 1,
    paddingHorizontal: t.space.screen,
    paddingTop: t.space.lg,
    paddingBottom: t.space.xl,
    gap: t.space.lg,
  },
  text: {
    fontSize: t.typography.body2.fontSize,
    lineHeight: t.typography.body2.lineHeight,
    color: t.color.labelNormal,
  },
  title: {
    fontSize: t.typography.titleBig.fontSize,
    lineHeight: t.typography.titleBig.lineHeight,
    letterSpacing: t.typography.titleBig.letterSpacing,
  },
  body1: {
    fontSize: t.typography.body1.fontSize,
    lineHeight: t.typography.body1.lineHeight,
  },
  body2: {
    fontSize: t.typography.body2.fontSize,
    lineHeight: t.typography.body2.lineHeight,
  },
  desc: {
    fontSize: t.typography.desc.fontSize,
    lineHeight: t.typography.desc.lineHeight,
  },
  labelText: {
    fontSize: t.typography.label.fontSize,
    lineHeight: t.typography.label.lineHeight,
  },
  captionText: {
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
  },
  statusText: {
    fontSize: t.typography.status.fontSize,
    lineHeight: t.typography.status.lineHeight,
  },
  center: { textAlign: "center" },
  button: {
    minHeight: t.size.button,
    minWidth: t.size.touchMin,
    borderRadius: t.radius.button,
    backgroundColor: t.color.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.space.sm,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
  },
  primaryPressed: {
    backgroundColor: t.color.brandPress,
  },
  secondary: {
    backgroundColor: t.color.surface2,
  },
  secondaryPressed: {
    backgroundColor: t.color.fillNormal,
  },
  secondaryDisabled: {
    backgroundColor: t.color.surface2,
  },
  dangerButton: {
    backgroundColor: t.color.danger,
  },
  dangerPressed: {
    backgroundColor: t.color.dangerPress,
  },
  dangerDisabled: {
    backgroundColor: t.color.dangerDis,
  },
  disabled: { backgroundColor: t.color.brandDis },
  buttonText: {
    fontSize: t.typography.body1.fontSize,
    lineHeight: t.typography.body1.lineHeight,
    color: t.color.surface,
    textAlign: "center",
  },
  card: {
    borderRadius: t.radius.card,
    padding: t.space.screen,
    minHeight: t.size.touchMin,
    minWidth: t.size.touchMin,
    backgroundColor: t.color.surface,
    ...t.shadow.card,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: t.color.brand,
    backgroundColor: t.color.brandTint,
  },
  inputWrap: {
    minHeight: t.size.input,
    minWidth: t.size.touchMin,
    backgroundColor: t.color.surface,
    borderWidth: 1.5,
    borderColor: t.color.lineNormal,
    borderRadius: t.radius.input,
    justifyContent: "center",
  },
  inputInner: {
    minHeight: t.size.input - 3,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: t.color.labelNormal,
    fontSize: t.typography.body1.fontSize,
    lineHeight: t.typography.body1.lineHeight,
  },
  inputDisabled: {
    backgroundColor: t.color.surface2,
  },
  inputDisabledText: {
    color: t.color.labelAlt,
  },
  chip: {
    borderWidth: 1,
    borderColor: t.color.chipLine,
    borderRadius: t.radius.pill,
    backgroundColor: t.color.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: t.size.buttonSmall,
    minWidth: t.size.touchMin,
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: t.color.brandDeep,
    backgroundColor: t.color.brandDeep,
  },
  chipDisabled: {
    borderColor: t.color.surface2,
    backgroundColor: t.color.surface2,
  },
  chipText: {
    fontSize: t.typography.chip.fontSize,
    lineHeight: t.typography.chip.lineHeight,
    color: t.color.labelNeutral,
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
    backgroundColor: t.color.surface,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    paddingHorizontal: t.space.xl,
    paddingTop: t.space.md,
    paddingBottom: t.space.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.color.lineNormal,
    alignSelf: "center",
    marginBottom: t.space.md,
  },
  appbar: {
    minHeight: t.size.appbar,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: t.space.xs,
  },
  appbarBack: {
    width: t.size.touchMin,
    height: t.size.touchMin,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  appbarSpacer: {
    width: t.size.touchMin,
    height: t.size.touchMin,
  },
  appbarCenterSpacer: {
    flex: 1,
  },
  appbarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: t.typography.appbar.fontSize,
    lineHeight: t.typography.appbar.lineHeight,
    color: t.color.labelNormal,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: t.radius.input,
    backgroundColor: t.color.surface2,
    paddingHorizontal: t.space.lg,
    paddingVertical: 14,
  },
  noticeIcon: {
    paddingTop: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: t.typography.desc.fontSize,
    lineHeight: t.typography.desc.lineHeight,
    color: t.color.labelNeutral,
  },
  trackerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: t.space.xs,
  },
  trackerItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
    gap: 6,
  },
  trackerLineLeft: {
    position: "absolute",
    top: 11,
    left: 0,
    right: "50%",
    marginRight: 16,
    height: 2,
    backgroundColor: t.color.lineNormal,
  },
  trackerLineRight: {
    position: "absolute",
    top: 11,
    left: "50%",
    marginLeft: 16,
    right: 0,
    height: 2,
    backgroundColor: t.color.lineNormal,
  },
  trackerLineActive: {
    backgroundColor: t.color.brand,
  },
  trackerDot: {
    width: 24,
    height: 24,
    borderRadius: t.radius.pill,
    backgroundColor: t.color.surface,
    borderWidth: 1.5,
    borderColor: t.color.lineNormal,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  trackerDotDone: {
    backgroundColor: t.color.brand,
    borderWidth: 0,
  },
  trackerDotCurrent: {
    backgroundColor: t.color.brandDeep,
    borderWidth: 0,
    shadowColor: t.color.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  trackerNum: {
    fontSize: t.typography.status.fontSize,
    lineHeight: 16,
    color: t.color.labelAssist,
  },
  trackerLabel: {
    fontSize: t.typography.status.fontSize,
    lineHeight: 16,
    color: t.color.labelAssist,
    textAlign: "center",
  },
  textLinkHit: {
    minHeight: t.size.touchMin,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: t.space.sm,
  },
  textLink: {
    fontSize: t.typography.label.fontSize,
    lineHeight: t.typography.label.lineHeight,
    color: t.color.brandDeep,
  },
  textQuiet: {
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    color: t.color.labelDesc,
    textDecorationLine: "underline",
  },
  screenFooter: {
    marginTop: "auto",
    paddingTop: t.space.xl,
    gap: t.space.sm,
  },
  helperNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 2,
  },
  helperNoticeIcon: {
    paddingTop: 2,
  },
  helperNoticeText: {
    flex: 1,
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    color: t.color.labelDesc,
  },
  errorNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: t.space.sm,
    borderRadius: t.radius.button,
    backgroundColor: t.color.dangerSoft,
    paddingHorizontal: t.space.md,
    paddingVertical: 10,
  },
  errorNoticeIcon: {
    paddingTop: 1,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    color: t.color.dangerPress,
  },
});
