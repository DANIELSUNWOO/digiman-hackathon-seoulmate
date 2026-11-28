import { Redirect } from "expo-router";
import { useMemo, useState, type ReactElement } from "react";
import { View } from "react-native";
import {
  PlaceSearch,
  type PlaceSearchApi,
} from "../../src/features/place-search";
import {
  createMockPlaceSearchApi,
  type MockScenario,
} from "../../src/features/place-search/mockApi";
import { theme } from "../../src/theme";
import { Chip, Label, Screen } from "../../src/ui";

const SCENARIOS: MockScenario[] = ["data", "empty", "error", "unavailable"];

// 장소 검색 확인용 경로. 로그인과 서버 없이 목 데이터로 본다. 개발 빌드에서만 열린다.
export default function DevPlaceSearch(): ReactElement {
  const [scenario, setScenario] = useState<MockScenario>("data");
  const [selected, setSelected] = useState("-");
  // 실제로 보낸 검색어. 입력이 멈췄을 때만 부르는지 눈으로 확인한다.
  const [calls, setCalls] = useState<string[]>([]);
  const api = useMemo((): PlaceSearchApi => {
    const mock = createMockPlaceSearchApi(scenario);
    return {
      search: (query, signal) => {
        setCalls((previous) => [...previous, query]);
        return mock.search(query, signal);
      },
    };
  }, [scenario]);
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Screen>
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}
      >
        {SCENARIOS.map((value) => (
          <Chip
            key={value}
            label={value}
            selected={scenario === value}
            onPress={() => setScenario(value)}
          />
        ))}
      </View>
      <Label language="ko">{`고른 장소: ${selected}`}</Label>
      <Label language="ko">{`호출 ${calls.length}회: ${calls.join(", ")}`}</Label>
      <PlaceSearch
        key={scenario}
        api={api}
        onSelect={(place) =>
          setSelected(`${place.name} (${place.lat}, ${place.lng})`)
        }
      />
    </Screen>
  );
}
