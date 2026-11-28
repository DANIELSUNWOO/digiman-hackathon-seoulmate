import React, { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, View } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
export function rangeValue(
  value: number,
  min: number,
  max: number,
  side: "min" | "max",
) {
  const next = Math.min(20, Math.max(5, Math.round(value)));
  return side === "min"
    ? ([Math.min(next, max), max] as const)
    : ([min, Math.max(next, min)] as const);
}
export function PinRange({
  min,
  max,
  onChange,
}: {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const latest = useRef({ min, max, onChange, width });
  latest.current = { min, max, onChange, width };
  const responders = useMemo(
    () =>
      (["min", "max"] as const).map((side) => {
        let initial = 0;
        return PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: () => {
            initial = latest.current[side];
          },
          onPanResponderMove: (_e, g) => {
            const x = latest.current;
            if (!x.width) return;
            const [a, b] = rangeValue(
              initial + (g.dx / x.width) * 15,
              x.min,
              x.max,
              side,
            );
            x.onChange(a, b);
          },
        });
      }),
    [],
  );
  const adjust = (side: "min" | "max", delta: number) => {
    const [a, b] = rangeValue(
      (side === "min" ? min : max) + delta,
      min,
      max,
      side,
    );
    onChange(a, b);
  };
  return (
    <View style={{ gap: 12 }}>
      <Label center weight="bold">
        {min} 〜 {max === 20 ? "20+" : max}
      </Label>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 44, justifyContent: "center", marginHorizontal: 12 }}
      >
        <View
          style={{
            height: 4,
            backgroundColor: theme.color.fillNormal,
            borderRadius: 4,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: `${((min - 5) / 15) * 100}%`,
            width: `${((max - min) / 15) * 100}%`,
            height: 4,
            backgroundColor: theme.color.brand,
          }}
        />
        {([min, max] as const).map((v, i) => (
          <View
            key={i}
            {...responders[i].panHandlers}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={i === 0 ? "最小ピン数" : "最大ピン数"}
            accessibilityValue={{
              min: 5,
              max: 20,
              now: v,
              text: v === 20 && i === 1 ? "20以上" : String(v),
            }}
            accessibilityActions={[
              { name: "increment" },
              { name: "decrement" },
            ]}
            onAccessibilityAction={(e) =>
              adjust(
                i === 0 ? "min" : "max",
                e.nativeEvent.actionName === "increment" ? 1 : -1,
              )
            }
            style={{
              position: "absolute",
              left: `${((v - 5) / 15) * 100}%`,
              marginLeft: -22,
              marginTop: min === max ? (i === 0 ? -12 : 12) : 0,
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: theme.color.surface,
                shadowColor: "#000",
                shadowOpacity: 0.22,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 1 },
                elevation: 3,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Label>5</Label>
        <Label>20+</Label>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {(["min", "max"] as const).map((side) => (
          <View key={side} style={{ flexDirection: "row", gap: 8 }}>
            {[-1, 1].map((delta) => (
              <Pressable
                key={delta}
                accessibilityRole="button"
                accessibilityLabel={`${side === "min" ? "最小" : "最大"}${delta === 1 ? "を増やす" : "を減らす"}`}
                onPress={() => adjust(side, delta)}
                style={{
                  padding: 10,
                  backgroundColor: theme.color.surface2,
                  borderRadius: 8,
                }}
              >
                <Label>
                  {side === "min" ? "最小" : "最大"}
                  {delta === 1 ? "+" : "−"}
                </Label>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
