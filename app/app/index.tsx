import { useEffect } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "../src/theme";
export default function Splash() {
  useEffect(() => {
    const id = setTimeout(() => router.replace("/country"), 2000);
    return () => clearTimeout(id);
  }, []);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="국적 선택으로 이동"
      onPress={() => router.replace("/country")}
      style={s.root}
    >
      <Text style={s.logo}>서울메이트</Text>
      <Text style={s.sub}>ソウルメイト</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.main,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: "LineSeedKR",
    color: theme.color.text,
  },
  sub: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 15,
    color: theme.color.text,
    marginTop: 8,
  },
});
