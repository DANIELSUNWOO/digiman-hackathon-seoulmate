import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Image, Text, View } from "react-native";
import { MapPin } from "phosphor-react-native";
import { theme } from "../../theme";
export function MatchingMotion({
  mine,
  mate,
  done,
}: {
  mine?: string | null;
  mate?: string | null;
  done: () => void;
}) {
  const move = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const dots = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  useEffect(() => {
    let alive = true;
    const arrive = Animated.timing(move, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    });
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    const dotLoops = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(dot, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 200),
        ]),
      ),
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (!alive) return;
        if (!reduce) {
          arrive.start();
          loop.start();
          dotLoops.forEach((d) => d.start());
        } else {
          move.setValue(1);
        }
      })
      .catch(() => {
        if (!alive) return;
        arrive.start();
        loop.start();
        dotLoops.forEach((d) => d.start());
      });
    const timer = setTimeout(done, 2500);
    return () => {
      alive = false;
      clearTimeout(timer);
      arrive.stop();
      loop.stop();
      dotLoops.forEach((d) => d.stop());
    };
  }, [done, move, pulse, dots]);
  const portrait = (uri?: string | null) =>
    uri ? (
      <Image
        source={{ uri }}
        style={{ width: 72, height: 72, borderRadius: 36 }}
      />
    ) : (
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: theme.color.surface2,
        }}
      />
    );
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.color.surface,
        gap: 28,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 24 }}>
        <Animated.View
          style={{
            transform: [
              {
                translateX: move.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-80, 0],
                }),
              },
            ],
          }}
        >
          {portrait(mine)}
        </Animated.View>
        <Animated.View
          style={{
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                }),
              },
            ],
          }}
        >
          <MapPin size={38} weight="fill" color={theme.color.brandDeep} />
        </Animated.View>
        <Animated.View
          style={{
            transform: [
              {
                translateX: move.interpolate({
                  inputRange: [0, 1],
                  outputRange: [80, 0],
                }),
              },
            ],
          }}
        >
          {portrait(mate)}
        </Animated.View>
      </View>
      <Text style={{ color: theme.color.brandDeep, fontSize: 18 }}>
        マッチング中
      </Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {dots.map((dot, i) => (
          <Animated.Text
            key={i}
            style={{
              color: theme.color.brandDeep,
              opacity: dot.interpolate({
                inputRange: [0, 1],
                outputRange: [0.25, 1],
              }),
            }}
          >
            ●
          </Animated.Text>
        ))}
      </View>
    </View>
  );
}
