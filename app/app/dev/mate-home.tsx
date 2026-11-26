import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MateHomeScreen } from "../../src/features/mate-home/MateHomeScreen";
import {
  createMockMateHomeApi,
  type MockScenario,
} from "../../src/features/mate-home/mockApi";
import { MyMapsScreen } from "../../src/features/mate-home/MyMapsScreen";
import { theme } from "../../src/theme";
import { Chip } from "../../src/ui";

const SCENARIOS: MockScenario[] = ["data", "empty", "error"];

// Q-04 화면 확인용 경로. 로그인과 서버 없이 목 데이터로 본다. 개발 빌드에서만 열린다.
export default function DevMateHome() {
  const [screen, setScreen] = useState<"home" | "maps">("home");
  const [scenario, setScenario] = useState<MockScenario>("data");
  const api = useMemo(() => createMockMateHomeApi(scenario), [scenario]);
  if (!__DEV__) return <Redirect href="/" />;
  const Screen = screen === "home" ? MateHomeScreen : MyMapsScreen;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.white }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.space.sm,
          paddingHorizontal: theme.space.screen,
        }}
      >
        <Chip
          label="홈"
          selected={screen === "home"}
          onPress={() => setScreen("home")}
        />
        <Chip
          label="지도"
          selected={screen === "maps"}
          onPress={() => setScreen("maps")}
        />
        {SCENARIOS.map((value) => (
          <Chip
            key={value}
            label={value}
            selected={scenario === value}
            onPress={() => setScenario(value)}
          />
        ))}
      </View>
      <Screen key={`${screen}-${scenario}`} api={api} />
    </SafeAreaView>
  );
}
