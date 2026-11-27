import { Redirect } from "expo-router";
import { useMemo, useState, type ReactElement } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  destinationFor,
  NotificationsScreen,
  type NotificationLang,
} from "../../src/features/notifications";
import {
  createMockNotificationsApi,
  type MockScenario,
} from "../../src/features/notifications/mockApi";
import { theme } from "../../src/theme";
import { Chip, Label } from "../../src/ui";

const LANGS: NotificationLang[] = ["ko", "ja"];
const SCENARIOS: MockScenario[] = ["data", "empty", "error", "actionError"];

// 알림 화면 확인용 경로. 로그인과 서버 없이 목 데이터로 본다. 개발 빌드에서만 열린다.
export default function DevNotifications(): ReactElement {
  const [lang, setLang] = useState<NotificationLang>("ko");
  const [scenario, setScenario] = useState<MockScenario>("data");
  const [opened, setOpened] = useState("-");
  const api = useMemo(
    () => createMockNotificationsApi(scenario, lang),
    [scenario, lang],
  );
  if (!__DEV__) return <Redirect href="/" />;

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
        {LANGS.map((value) => (
          <Chip
            key={value}
            label={value}
            selected={lang === value}
            onPress={() => setLang(value)}
          />
        ))}
        {SCENARIOS.map((value) => (
          <Chip
            key={value}
            label={value}
            selected={scenario === value}
            onPress={() => setScenario(value)}
          />
        ))}
        <Label language="ko">{`마지막 이동: ${opened}`}</Label>
      </View>
      <View key={`${scenario}-${lang}`} style={{ flex: 1 }}>
        <NotificationsScreen
          api={api}
          lang={lang}
          onOpen={(item) =>
            setOpened(`${item.type} → ${String(destinationFor(item))}`)
          }
          onBack={() => setOpened("뒤로")}
        />
      </View>
    </SafeAreaView>
  );
}
