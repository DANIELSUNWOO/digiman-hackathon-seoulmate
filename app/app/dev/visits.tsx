import { Redirect } from "expo-router";
import { useMemo, useState, type ReactElement } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ViewerLang } from "../../src/features/translation";
import { VisitListScreen } from "../../src/features/visits";
import {
  createMockVisitsApi,
  type MockScenario,
} from "../../src/features/visits/mockApi";
import { theme } from "../../src/theme";
import { Chip, Label } from "../../src/ui";

const LANGS: ViewerLang[] = ["ko", "ja"];
const SCENARIOS: MockScenario[] = ["data", "empty", "error", "actionError"];

// 방문 기록 화면 확인용 경로. 로그인과 서버 없이 목 데이터로 본다. 개발 빌드에서만 열린다.
// ko는 메이트, ja는 여행자 화면이다.
export default function DevVisits(): ReactElement {
  const [lang, setLang] = useState<ViewerLang>("ko");
  const [scenario, setScenario] = useState<MockScenario>("data");
  const [reported, setReported] = useState("-");
  const api = useMemo(() => createMockVisitsApi(scenario), [scenario]);
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
        <Label language="ko">{`마지막 신고: ${reported}`}</Label>
      </View>
      <View key={`${scenario}-${lang}`} style={{ flex: 1 }}>
        <VisitListScreen
          api={api}
          matchId={101}
          lang={lang}
          canWrite={lang === "ko"}
          onBack={() => {}}
          onReport={(target) =>
            setReported(`${target.targetType} ${target.targetId}`)
          }
        />
      </View>
    </SafeAreaView>
  );
}
