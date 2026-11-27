import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";
import { House, MapTrifold, User } from "phosphor-react-native";
import { useRole } from "../../src/state";
import { useSession } from "../../src/session";
import { theme } from "../../src/theme";
import { nextStep, onboardingRouteFor } from "../../src/users";

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
  if (load.kind !== "ready") return <Redirect href="/account" />;

  const step = nextStep(load.me);
  if (step) return <Redirect href={onboardingRouteFor(step)} />;

  const ko = load.me.language === "ko";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.brandDeep,
        tabBarInactiveTintColor: theme.color.labelAssist,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.lineAlt,
          borderTopWidth: 1,
        },
        tabBarLabel: ({ focused, children }) => (
          <Text
            style={{
              fontSize: theme.typography.status.fontSize,
              lineHeight: theme.typography.status.lineHeight,
              color: focused ? theme.color.brandDeep : theme.color.labelAssist,
              fontFamily: `${ko ? "NotoSansKR" : "NotoSansJP"}_${focused ? "600SemiBold" : "500Medium"}`,
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
            <House
              color={focused ? theme.color.brandDeep : theme.color.labelAssist}
              size={theme.size.icon}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: ko ? "지도" : "地図",
          tabBarIcon: ({ focused }) => (
            <MapTrifold
              color={focused ? theme.color.brandDeep : theme.color.labelAssist}
              size={theme.size.icon}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: ko ? "마이" : "マイ",
          tabBarIcon: ({ focused }) => (
            <User
              color={focused ? theme.color.brandDeep : theme.color.labelAssist}
              size={theme.size.icon}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
