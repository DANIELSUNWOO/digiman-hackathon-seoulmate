import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EditMapScreen,
  MapDetailScreen,
  MateHomeScreen,
  MyMapsScreen,
  NewMapScreen,
} from "../../src/features/mate-home";
import type { MateHomeApi } from "../../src/features/mate-home/api";
import {
  createMockMateHomeApi,
  type MockScenario,
} from "../../src/features/mate-home/mockApi";
import { theme } from "../../src/theme";
import { Chip } from "../../src/ui";

const SCENARIOS: MockScenario[] = ["data", "empty", "error"];

type DevView =
  | { name: "home" }
  | { name: "maps" }
  | { name: "new" }
  | { name: "detail"; mapId: number }
  | { name: "edit"; mapId: number };

// 메이트 화면 확인용 경로. 로그인과 서버 없이 목 데이터로 본다. 개발 빌드에서만 열린다.
export default function DevMateHome() {
  const [view, setView] = useState<DevView>({ name: "home" });
  const [scenario, setScenario] = useState<MockScenario>("data");
  const api = useMemo(() => createMockMateHomeApi(scenario), [scenario]);
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.white }}>
      <DevToolbar
        view={view}
        scenario={scenario}
        onView={setView}
        onScenario={(value) => {
          setScenario(value);
          // 목 데이터가 새로 만들어지므로 상세에 머물지 않는다.
          setView(view.name === "home" ? view : { name: "maps" });
        }}
      />
      <View key={`${JSON.stringify(view)}-${scenario}`} style={{ flex: 1 }}>
        <DevScreen api={api} view={view} onView={setView} />
      </View>
    </SafeAreaView>
  );
}

function DevToolbar({
  view,
  scenario,
  onView,
  onScenario,
}: {
  view: DevView;
  scenario: MockScenario;
  onView: (view: DevView) => void;
  onScenario: (scenario: MockScenario) => void;
}) {
  return (
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
        selected={view.name === "home"}
        onPress={() => onView({ name: "home" })}
      />
      <Chip
        label="지도"
        selected={view.name !== "home"}
        onPress={() => onView({ name: "maps" })}
      />
      {SCENARIOS.map((value) => (
        <Chip
          key={value}
          label={value}
          selected={scenario === value}
          onPress={() => onScenario(value)}
        />
      ))}
    </View>
  );
}

function DevScreen({
  api,
  view,
  onView,
}: {
  api: MateHomeApi;
  view: DevView;
  onView: (view: DevView) => void;
}) {
  const showMaps = () => onView({ name: "maps" });
  const showDetail = (mapId: number) => onView({ name: "detail", mapId });

  if (view.name === "home") return <MateHomeScreen api={api} />;
  if (view.name === "maps")
    return (
      <MyMapsScreen
        api={api}
        onCreate={() => onView({ name: "new" })}
        onOpenMap={showDetail}
      />
    );
  if (view.name === "new")
    return <NewMapScreen api={api} onBack={showMaps} onCreated={showDetail} />;
  const { mapId } = view;
  if (view.name === "detail")
    return (
      <MapDetailScreen
        api={api}
        mapId={mapId}
        onBack={showMaps}
        onEdit={() => onView({ name: "edit", mapId })}
        onDeleted={showMaps}
      />
    );
  return (
    <EditMapScreen
      api={api}
      mapId={mapId}
      onBack={() => showDetail(mapId)}
      onSaved={() => showDetail(mapId)}
    />
  );
}
