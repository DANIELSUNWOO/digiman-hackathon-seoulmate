import { Redirect, Tabs } from "expo-router";
import { useContext, useEffect } from "react";
import { Text, useWindowDimensions } from "react-native";
import { House, MapTrifold, User } from "phosphor-react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { useRole } from "../../src/state";
import { useSession } from "../../src/session";
import { theme } from "../../src/theme";
import { nextStep, onboardingRouteFor } from "../../src/users";

const TAB_BAR_CONTENT_HEIGHT = 58;

export function getTabBarLayoutMetrics(bottomInset: number, fontScale = 1) {
  const safeBottom = Math.max(bottomInset, 0);
  // UIKit item padding 5 + 5, icon 24, icon margin 2, label line 16, bar top 2.
  const contentHeight = Math.max(
    TAB_BAR_CONTENT_HEIGHT,
    Math.ceil(2 + 10 + 24 + 2 + 16 * Math.max(fontScale, 1)),
  );
  return {
    contentHeight,
    bottomInset: safeBottom,
    totalHeight: contentHeight + safeBottom,
  };
}

export default function TabsLayout() {
  const { ready: roleReady, syncServerRole } = useRole();
  const { session, ready: sessionReady, load, busy } = useSession();
  const insets = useContext(SafeAreaInsetsContext);
  const { fontScale } = useWindowDimensions();
  const { bottomInset, totalHeight } = getTabBarLayoutMetrics(
    insets?.bottom ?? 0,
    fontScale,
  );

  useEffect(() => {
    if (session && load.kind === "ready")
      syncServerRole(load.me.role === "MATE" ? "mate" : "traveler");
  }, [session?.user.id, load.kind === "ready" ? load.me.role : null]);

  if (!roleReady || !sessionReady) return null;
  if (!session) return <Redirect href="/auth" />;
  if (busy || load.kind === "loading") return null;
  if (load.kind !== "ready") return <Redirect href="/account" />;

  const step = nextStep(load.me);
  if (step && step !== "trip")
    return <Redirect href={onboardingRouteFor(step)} />;

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
          height: totalHeight,
          paddingBottom: bottomInset,
          paddingTop: 2,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarIconStyle: {
          width: 28,
          height: 24,
          marginBottom: 2,
        },
        tabBarLabel: ({ focused, children }) => (
          <Text
            numberOfLines={1}
            style={{
              fontSize: theme.typography.status.fontSize,
              lineHeight: 16,
              includeFontPadding: false,
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
