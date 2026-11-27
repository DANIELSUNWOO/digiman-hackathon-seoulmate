import React, {
  type ComponentRef,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CaretDown,
  CaretLeft,
  Info,
  WarningCircle,
} from "phosphor-react-native";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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

type ViewHandle = ComponentRef<typeof View>;
type ScrollViewHandle = ComponentRef<typeof ScrollView>;

type ScreenScrollContextValue = {
  registerFocus: (target: ViewHandle | null) => void;
  clearFocus: (target: ViewHandle | null) => void;
  scrollInputIntoView: (target: ViewHandle | null) => void;
  notifyFooterLayout: (footerBottom: number, prevFooterBottom: number) => void;
};

const ScreenScrollContext = createContext<ScreenScrollContextValue | null>(
  null,
);

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
  const viewportRef = useRef<ViewHandle | null>(null);
  const scrollRef = useRef<ScrollViewHandle | null>(null);
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const focusedTargetRef = useRef<ViewHandle | null>(null);
  const keyboardTopRef = useRef(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [keyboardInset, setKeyboardInset] = useState(0);

  function scrollInputIntoView(target: ViewHandle | null) {
    const viewport = viewportRef.current;
    const scroller = scrollRef.current;
    if (!target || !viewport || !scroller) return;
    if (
      typeof viewport.measureInWindow !== "function" ||
      typeof target.measureInWindow !== "function"
    ) {
      return;
    }
    viewport.measureInWindow((_sx, svY, _sw, svH) => {
      if (!mountedRef.current || focusedTargetRef.current !== target) return;
      target.measureInWindow((_tx, ty, _tw, th) => {
        if (!mountedRef.current || focusedTargetRef.current !== target) return;
        const kbTop = keyboardTopRef.current;
        const bottomEdge = kbTop > 0 ? Math.min(svY + svH, kbTop) : svY + svH;
        const visibleBottom = bottomEdge - 24;
        const visibleTop = svY + 16;
        if (ty + th > visibleBottom) {
          const nextY = Math.max(
            0,
            scrollOffsetRef.current + (ty + th - visibleBottom),
          );
          scroller.scrollTo?.({ y: nextY, animated: true });
        } else if (ty < visibleTop) {
          const nextY = Math.max(
            0,
            scrollOffsetRef.current - (visibleTop - ty),
          );
          scroller.scrollTo?.({ y: nextY, animated: true });
        }
      });
    });
  }

  function scheduleFocusScroll(target: ViewHandle | null) {
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    if (!target) return;
    scrollTimerRef.current = setTimeout(() => {
      scrollTimerRef.current = null;
      scrollInputIntoView(target);
    }, 60);
  }

  useEffect(() => {
    mountedRef.current = true;
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard?.addListener?.(showEvent, (e) => {
      const winH = Dimensions?.get?.("window")?.height ?? 0;
      const screenY = e?.endCoordinates?.screenY ?? 0;
      const kbHeight = e?.endCoordinates?.height ?? 0;
      const kbTop = screenY > 0 ? screenY : Math.max(0, winH - kbHeight);
      keyboardTopRef.current = kbTop;

      if (Platform.OS !== "ios" && Platform.OS !== "web") {
        const viewport = viewportRef.current;
        if (viewport && typeof viewport.measureInWindow === "function") {
          viewport.measureInWindow((_sx, svY, _sw, svH) => {
            if (!mountedRef.current) return;
            const overlap =
              kbTop > 0
                ? Math.max(0, Math.round(svY + svH - kbTop))
                : Math.max(0, Math.round(kbHeight));
            setKeyboardInset(overlap);
            scheduleFocusScroll(focusedTargetRef.current);
          });
          return;
        }
        setKeyboardInset(Math.max(0, Math.round(kbHeight)));
      }
      scheduleFocusScroll(focusedTargetRef.current);
    });

    const hideSub = Keyboard?.addListener?.(hideEvent, () => {
      keyboardTopRef.current = 0;
      setKeyboardInset(0);
    });

    return () => {
      mountedRef.current = false;
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
      showSub?.remove?.();
      hideSub?.remove?.();
    };
  }, []);

  const contextValue: ScreenScrollContextValue = {
    registerFocus: (target) => {
      focusedTargetRef.current = target;
      scheduleFocusScroll(target);
    },
    clearFocus: (target) => {
      if (focusedTargetRef.current === target) {
        focusedTargetRef.current = null;
      }
    },
    scrollInputIntoView,
    notifyFooterLayout: (footerBottom, prevFooterBottom) => {
      if (
        prevFooterBottom > 0 &&
        keyboardTopRef.current === 0 &&
        footerBottom > prevFooterBottom + 4 &&
        prevFooterBottom <=
          scrollOffsetRef.current + viewportHeightRef.current + 24 &&
        footerBottom > scrollOffsetRef.current + viewportHeightRef.current - 8
      ) {
        requestAnimationFrame(() => {
          if (mountedRef.current) {
            scrollRef.current?.scrollToEnd?.({ animated: true });
          }
        });
      }
    },
  };

  const scrollBody = (
    <ScreenScrollContext.Provider value={contextValue}>
      <View ref={viewportRef} collapsable={false} style={s.flex}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          onLayout={(e: LayoutChangeEvent) => {
            viewportHeightRef.current = e.nativeEvent.layout.height;
          }}
          contentContainerStyle={[
            s.content,
            contentStyle,
            keyboardInset > 0
              ? { paddingBottom: t.space.xl + keyboardInset }
              : null,
          ]}
        >
          {children}
        </ScrollView>
      </View>
    </ScreenScrollContext.Provider>
  );

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom", "left", "right"]}>
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView behavior="padding" style={s.flex}>
          {scrollBody}
        </KeyboardAvoidingView>
      ) : (
        scrollBody
      )}
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
    | "titleBig"
    | "sheetTitle"
    | "body1"
    | "body2"
    | "desc"
    | "label"
    | "caption"
    | "status";
}) {
  const { role } = useRole();
  const isKo = language ? language === "ko" : role === "mate";
  const defaultWeight: FontWeightName =
    title || variant === "titleBig" || variant === "sheetTitle"
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
      : variant === "sheetTitle"
        ? s.sheetTitleText
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
  onContentSizeChange,
  inputRef,
  ...props
}: TextInputProps & {
  language?: "ko" | "ja";
  error?: boolean;
  inputRef?: React.Ref<React.ComponentRef<typeof TextInput>>;
}) {
  const fontFamily = useFontFamily("regular", language);
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const wrapRef = useRef<ViewHandle | null>(null);
  const screenScroll = useContext(ScreenScrollContext);
  const isMultiline = Boolean(props.multiline);
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
    <View ref={wrapRef} collapsable={false}>
      <Animated.View
        style={[
          s.inputWrap,
          isMultiline && s.inputWrapMultiline,
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
          ref={inputRef}
          placeholderTextColor={t.color.labelAlt}
          underlineColorAndroid="transparent"
          {...props}
          onFocus={(e) => {
            setFocused(true);
            screenScroll?.registerFocus(wrapRef.current);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            screenScroll?.clearFocus(wrapRef.current);
            onBlur?.(e);
          }}
          onContentSizeChange={(e) => {
            if (focused && isMultiline) {
              screenScroll?.scrollInputIntoView(wrapRef.current);
            }
            onContentSizeChange?.(e);
          }}
          style={[
            isMultiline ? s.inputInnerMultiline : s.inputInnerSingle,
            webInputReset,
            { fontFamily },
            disabled && s.inputDisabledText,
            props.style,
          ]}
        />
      </Animated.View>
    </View>
  );
}

export function Chip({
  label,
  sublabel,
  selected,
  disabled = false,
  muted = false,
  showChevron = false,
  language,
  onPress,
}: {
  label: string;
  sublabel?: string;
  selected?: boolean;
  disabled?: boolean;
  muted?: boolean;
  showChevron?: boolean;
  language?: "ko" | "ja";
  onPress: () => void;
}) {
  const fontFamily = useFontFamily(selected ? "semibold" : "medium", language);
  const subFontFamily = useFontFamily("regular", language);
  const chevronColor = selected
    ? t.color.surface
    : muted || disabled
      ? t.color.labelDisable
      : t.color.labelNeutral;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.chip,
        muted && !selected && s.chipMuted,
        selected && s.chipSelected,
        disabled && !selected && s.chipDisabled,
      ]}
    >
      <Text
        style={[
          s.chipText,
          { fontFamily },
          muted && !selected && { color: t.color.labelDisable },
          selected && { color: t.color.surface },
          disabled && !selected && { color: t.color.labelDisable },
        ]}
      >
        {label}
        {sublabel ? (
          <Text
            style={[
              s.chipSublabel,
              { fontFamily: subFontFamily },
              selected && { color: t.color.surface },
              (muted || disabled) &&
                !selected && { color: t.color.labelDisable },
            ]}
          >
            {sublabel}
          </Text>
        ) : null}
      </Text>
      {showChevron ? <CaretDown size={12} color={chevronColor} /> : null}
    </Pressable>
  );
}

const SHEET_ENTER_EASING = Easing.bezier(0.2, 0, 0, 1);
const SHEET_EXIT_EASING = Easing.bezier(0.4, 0, 1, 1);
const SHEET_DIM_OPEN_MS = t.duration.base;
const SHEET_PANEL_OPEN_MS = t.duration.sheet;
const SHEET_DIM_CLOSE_MS = 180;
const SHEET_PANEL_CLOSE_MS = t.duration.base;

export function BottomSheet({
  visible,
  onClose,
  onDismissed,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  children: React.ReactNode;
}) {
  const { role } = useRole();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const sheetHeightRef = useRef(Dimensions.get("window").height);
  const fullyClosedRef = useRef(true);
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const panelProgress = useRef(
    new Animated.Value(Dimensions.get("window").height),
  ).current;
  const [shown, setShown] = useState(false);
  const [measured, setMeasured] = useState(false);
  const openingRef = useRef(false);
  const animSeqRef = useRef(0);
  const activeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;
  const useNativeDriver = Platform.OS !== "web";

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (!shown || !measured) return;
      if (reducedMotion) {
        ++animSeqRef.current;
        activeAnimRef.current?.stop();
        activeAnimRef.current = null;
        openingRef.current = true;
        fullyClosedRef.current = false;
        dimOpacity.setValue(1);
        panelProgress.setValue(0);
        return;
      }
      if (openingRef.current) return;
      openingRef.current = true;
      activeAnimRef.current?.stop();
      const seq = ++animSeqRef.current;
      if (fullyClosedRef.current)
        panelProgress.setValue(sheetHeightRef.current);
      fullyClosedRef.current = false;
      const anim = Animated.parallel([
        Animated.timing(dimOpacity, {
          toValue: 1,
          duration: SHEET_DIM_OPEN_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }),
        Animated.timing(panelProgress, {
          toValue: 0,
          duration: SHEET_PANEL_OPEN_MS,
          easing: SHEET_ENTER_EASING,
          useNativeDriver,
        }),
      ]);
      activeAnimRef.current = anim;
      anim.start(({ finished }) => {
        if (finished && animSeqRef.current === seq)
          activeAnimRef.current = null;
      });
      return;
    }
    if (!mounted) return;
    openingRef.current = false;
    activeAnimRef.current?.stop();
    const seq = ++animSeqRef.current;
    const complete = () => {
      if (animSeqRef.current !== seq) return;
      activeAnimRef.current = null;
      fullyClosedRef.current = true;
      setMounted(false);
      setShown(false);
      setMeasured(false);
      onDismissedRef.current?.();
    };
    if (reducedMotion) {
      dimOpacity.setValue(0);
      panelProgress.setValue(sheetHeightRef.current);
      complete();
      return;
    }
    const anim = Animated.parallel([
      Animated.timing(dimOpacity, {
        toValue: 0,
        duration: SHEET_DIM_CLOSE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver,
      }),
      Animated.timing(panelProgress, {
        toValue: sheetHeightRef.current,
        duration: SHEET_PANEL_CLOSE_MS,
        easing: SHEET_EXIT_EASING,
        useNativeDriver,
      }),
    ]);
    activeAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) complete();
    });
  }, [
    visible,
    reducedMotion,
    mounted,
    shown,
    measured,
    dimOpacity,
    panelProgress,
    useNativeDriver,
  ]);

  useEffect(
    () => () => {
      ++animSeqRef.current;
      activeAnimRef.current?.stop();
    },
    [],
  );

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      hardwareAccelerated={Platform.OS === "android"}
      onRequestClose={onClose}
      onShow={() => setShown(true)}
    >
      <View
        style={s.modalRoot}
        pointerEvents={visible ? "auto" : "none"}
        accessibilityViewIsModal
      >
        {/* Keep full-screen dim outside KeyboardAvoidingView and fade opacity separately from panel slide. */}
        <Animated.View
          style={[s.scrim, { opacity: dimOpacity }]}
          pointerEvents={visible ? "auto" : "none"}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={role === "mate" ? "닫기" : "閉じる"}
            onPress={onClose}
          />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.overlay}
          pointerEvents="box-none"
        >
          <Animated.View
            onLayout={(e) => {
              const h = Math.round(e.nativeEvent.layout.height);
              if (h > 0) {
                sheetHeightRef.current = Math.max(h, 240);
                if (!measured) setMeasured(true);
              }
            }}
            style={[
              s.sheetWrap,
              { transform: [{ translateY: panelProgress }] },
            ]}
          >
            <SafeAreaView edges={["bottom"]} style={s.sheet}>
              <View style={s.sheetHandle} />
              <ScreenScrollContext.Provider value={null}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </ScrollView>
              </ScreenScrollContext.Provider>
            </SafeAreaView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
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
  const screenScroll = useContext(ScreenScrollContext);
  const prevBottomRef = useRef(0);

  return (
    <View
      onLayout={(e) => {
        const bottom = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
        const prev = prevBottomRef.current;
        prevBottomRef.current = bottom;
        screenScroll?.notifyFooterLayout(bottom, prev);
      }}
      style={[s.screenFooter, style]}
    >
      {children}
    </View>
  );
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
  flex: { flex: 1 },
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
    includeFontPadding: false,
  },
  title: {
    fontSize: t.typography.titleBig.fontSize,
    lineHeight: t.typography.titleBig.lineHeight,
    letterSpacing: t.typography.titleBig.letterSpacing,
  },
  sheetTitleText: {
    fontSize: t.typography.sheetTitle.fontSize,
    lineHeight: t.typography.sheetTitle.lineHeight,
    letterSpacing: -0.2,
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
    flexShrink: 1,
    includeFontPadding: false,
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
  inputWrapMultiline: {
    justifyContent: "flex-start",
  },
  inputInnerSingle: {
    minHeight: t.size.input - 3,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 10 : 4,
    color: t.color.labelNormal,
    fontSize: t.typography.body1.fontSize,
    ...(Platform.OS === "web"
      ? { lineHeight: t.typography.body1.lineHeight }
      : {}),
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  inputInnerMultiline: {
    minHeight: t.size.input - 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: t.color.labelNormal,
    fontSize: t.typography.body1.fontSize,
    lineHeight: t.typography.body1.lineHeight,
    textAlignVertical: "top",
    includeFontPadding: false,
  },
  inputDisabled: {
    backgroundColor: t.color.surface2,
  },
  inputDisabledText: {
    color: t.color.labelAlt,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  chipMuted: {
    borderColor: t.color.surface2,
    backgroundColor: t.color.surface2,
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
  chipSublabel: {
    fontSize: 12,
    lineHeight: t.typography.chip.lineHeight,
    color: t.color.labelDesc,
  },
  modalRoot: { flex: 1 },
  overlay: { flex: 1, justifyContent: "flex-end" },
  scrim: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: t.color.dim,
  },
  sheetWrap: {
    width: "100%",
    maxHeight: "85%",
  },
  sheet: {
    maxHeight: "100%",
    backgroundColor: t.color.surface,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    paddingHorizontal: t.space.xl,
    paddingTop: t.space.md,
    paddingBottom: t.space.xl,
    ...t.shadow.sheet,
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
    height: t.typography.desc.lineHeight,
    justifyContent: "center",
  },
  noticeText: {
    flex: 1,
    fontSize: t.typography.desc.fontSize,
    lineHeight: t.typography.desc.lineHeight,
    color: t.color.labelNeutral,
    includeFontPadding: false,
    textAlign: "left",
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
    height: t.typography.caption.lineHeight,
    justifyContent: "center",
  },
  helperNoticeText: {
    flex: 1,
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    color: t.color.labelDesc,
    includeFontPadding: false,
    textAlign: "left",
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
    height: t.typography.caption.lineHeight,
    justifyContent: "center",
  },
  errorNoticeText: {
    flex: 1,
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    color: t.color.dangerPress,
    includeFontPadding: false,
    textAlign: "left",
  },
});
