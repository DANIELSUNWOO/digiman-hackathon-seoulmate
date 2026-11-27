import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "../src/theme";
import { useRole } from "../src/state";
import { useSession } from "../src/session";
import { nextStep } from "../src/users";
export default function Splash() {
  const { ready: roleReady } = useRole();
  const { session, ready, load, busy } = useSession();
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), 2000);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!elapsed || !roleReady || !ready || busy) return;
    if (!session) router.replace("/country");
    else if (load.kind === "ready" && !nextStep(load.me))
      router.replace("/(tabs)");
    else if (load.kind !== "loading") router.replace("/account");
  }, [elapsed, roleReady, ready, session, load, busy]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="시작하기"
      onPress={() => setElapsed(true)}
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
