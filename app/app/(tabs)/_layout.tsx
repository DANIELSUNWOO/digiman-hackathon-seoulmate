import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { House, MapTrifold, User } from "phosphor-react-native";
import { useRole } from "../../src/state";
import { useSession } from "../../src/session";
import { theme } from "../../src/theme";
import { nextStep } from "../../src/users";
export default function TabsLayout() {
  const { ready: roleReady, syncServerRole } = useRole();
  const { session, ready: sessionReady, load, busy } = useSession();
  useEffect(() => {
    if (session && load.kind === "ready")
      syncServerRole(load.me.role === "MATE" ? "mate" : "traveler");
  }, [session?.user.id, load.kind === "ready" ? load.me.role : null]);
  if (!roleReady || !sessionReady) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready" || nextStep(load.me))
    return <Redirect href="/account" />;
  const ko = load.me.language === "ko";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.text,
        tabBarInactiveTintColor: theme.color.medium,
        tabBarLabel: ({ focused, children }) => (
          <Text
            style={{
              fontSize: theme.typography.caption2.fontSize,
              lineHeight: theme.typography.caption2.lineHeight,
              color: focused ? theme.color.text : theme.color.medium,
              fontFamily: `${ko ? "NotoSansKR" : "NotoSansJP"}_${focused ? "700Bold" : "400Regular"}`,
            }}
          >
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: ko ? "홈" : "ホーム",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              <House
                color={focused ? theme.color.text : theme.color.medium}
                size={theme.size.icon}
                weight={focused ? "fill" : "regular"}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: ko ? "지도" : "地図",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              <MapTrifold
                color={focused ? theme.color.text : theme.color.medium}
                size={theme.size.icon}
                weight={focused ? "fill" : "regular"}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: ko ? "마이" : "マイ",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              <User
                color={focused ? theme.color.text : theme.color.medium}
                size={theme.size.icon}
                weight={focused ? "fill" : "regular"}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: theme.size.icon + 2 * theme.space.md,
    height: theme.size.icon + 2 * theme.space.xs,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: { backgroundColor: theme.color.main },
});
