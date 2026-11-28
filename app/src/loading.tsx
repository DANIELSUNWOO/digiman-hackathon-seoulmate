import React, { useEffect, useRef } from "react";
import { Animated, Platform, View, type DimensionValue } from "react-native";
import { theme } from "./theme";
import { useReducedMotion } from "./ui";

export type LoadingShape =
  "cards" | "chips" | "form" | "calendar" | "profile" | "rows" | "preview";

const TAG_CHIP_WIDTHS = [
  [74, 96, 68, 108, 82],
  [88, 72, 104, 78],
  [80, 92, 66, 98, 76],
];

export function LoadingSkeleton({
  label,
  shape = "cards",
}: {
  label: string;
  shape?: LoadingShape;
}) {
  const reduced = useReducedMotion(true);
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    opacity.setValue(1);
    if (reduced) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 500,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      opacity.setValue(1);
    };
  }, [opacity, reduced]);

  const block = (
    width: DimensionValue,
    height: number,
    key: string,
    radius = 6,
  ) => (
    <View
      key={key}
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: theme.color.skeleton,
      }}
    />
  );

  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ opacity, gap: shape === "chips" ? 28 : 12 }}
      >
        {shape === "cards" &&
          [0, 1, 2].map((n) => (
            <View
              key={n}
              style={{
                padding: theme.space.screen,
                borderRadius: theme.radius.card,
                backgroundColor: theme.color.surface2,
                gap: 8,
              }}
            >
              {block("72%", 20, "title")}
              {block("46%", 16, "detail")}
              {block("36%", 16, "name")}
            </View>
          ))}
        {shape === "chips" &&
          TAG_CHIP_WIDTHS.map((rowWidths, groupIdx) => (
            <View key={groupIdx} style={{ gap: 12 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {block(22, 22, "icon", 11)}
                {block(
                  groupIdx === 1 ? 116 : groupIdx === 2 ? 84 : 96,
                  18,
                  "heading",
                )}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {rowWidths.map((w, idx) =>
                  block(w, 38, `chip-${groupIdx}-${idx}`, theme.radius.pill),
                )}
              </View>
            </View>
          ))}
        {shape === "form" &&
          [0, 1, 2].map((n) => (
            <View key={n} style={{ gap: 8 }}>
              {block("35%", 20, "label")}
              {block("100%", theme.size.input, "field", theme.radius.input)}
            </View>
          ))}
        {shape === "calendar" && (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1].map((n) => (
                <View key={n} style={{ flex: 1 }}>
                  {block("100%", 62, String(n), 16)}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1, 2].map((n) => (
                <View key={n} style={{ flex: 1 }}>
                  {block("100%", 40, String(n), 20)}
                </View>
              ))}
            </View>
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 44,
              }}
            >
              {block("35%", 20, "month")}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {Array.from({ length: 42 }, (_, n) => (
                <View
                  key={n}
                  style={{
                    width: "14.285714%",
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {block(20, 16, String(n))}
                </View>
              ))}
            </View>
          </>
        )}
        {shape === "rows" &&
          [0, 1, 2].map((n) => (
            <View
              key={n}
              style={{
                flexDirection: "row",
                gap: 12,
                padding: theme.space.lg,
                borderRadius: theme.radius.cardSub,
                backgroundColor: theme.color.surface2,
                alignItems: "flex-start",
              }}
            >
              {block(24, 24, "icon", 12)}
              <View style={{ flex: 1, gap: 4 }}>
                {block("80%", 16, "title")}
                {block("50%", 12, "time")}
              </View>
            </View>
          ))}
        {shape === "preview" && (
          <>
            {block("68%", 24, "title")}
            {block("88%", 20, "caption")}
            {block("38%", 20, "mate")}
            {block("25%", 20, "slots")}
            {block("100%", 52, "translation", 10)}
            {block("100%", 180, "map", 16)}
            {[0, 1].map((n) => (
              <View
                key={n}
                style={{
                  padding: theme.space.screen,
                  gap: 8,
                  borderRadius: 16,
                  backgroundColor: theme.color.surface2,
                }}
              >
                {block("65%", 20, "spot")}
                {block("85%", 16, "address")}
                {block("100%", 180, "photo", 10)}
                {block("80%", 16, "review")}
              </View>
            ))}
          </>
        )}
        {shape === "profile" && (
          <>
            {block(44, 44, "avatar", 22)}
            {block("60%", 20, "name")}
            {block("100%", 48, "field")}
            {block("100%", 48, "field2")}
          </>
        )}
      </Animated.View>
    </View>
  );
}
