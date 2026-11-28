import { Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EditMapScreen,
  MapDetailScreen,
  MateHomeScreen,
  MyMapsScreen,
  NewMapScreen,
  PreviewSelectScreen,
} from "../../src/features/mate-home";
import type { MateHomeApi } from "../../src/features/mate-home/api";
import {
  createMockMateHomeApi,
  type MockScenario,
} from "../../src/features/mate-home/mockApi";
import { AddSpotFlow, SpotEditScreen } from "../../src/features/spot-form";
import { NotificationBell } from "../../src/features/notifications";
import { createMockNotificationsApi } from "../../src/features/notifications/mockApi";
import {
  mockPickPhoto,
  mockSpotFormApi,
} from "../../src/features/spot-form/mockApi";
import { createMockPlaceSearchApi } from "../../src/features/place-search/mockApi";
import { theme } from "../../src/theme";
import { Chip } from "../../src/ui";

const SCENARIOS: MockScenario[] = [
  "data",
  "noMatch",
  "draft",
  "empty",
  "error",
];
const mockPlaces = createMockPlaceSearchApi("data");
const mockNotifications = createMockNotificationsApi("data", "ko");

type DevView =
  | { name: "home" }
  | { name: "maps" }
  | { name: "new" }
  | { name: "detail"; mapId: number }
  | { name: "edit"; mapId: number }
  | { name: "addSpot"; mapId: number }
  | { name: "spot"; mapId: number; spotId: number }
  | { name: "previews"; mapId: number };

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

interface DevScreenProps {
  api: MateHomeApi;
  view: DevView;
  onView: (view: DevView) => void;
}

function DevScreen({ api, view, onView }: DevScreenProps) {
  const showMaps = () => onView({ name: "maps" });
  const showDetail = (mapId: number) => onView({ name: "detail", mapId });
  const router = useRouter();

  if (view.name === "home")
    return (
      <MateHomeScreen
        api={api}
        headerRight={
          <NotificationBell
            api={mockNotifications}
            lang="ko"
            onPress={() => {}}
          />
        }
        // 방문 기록은 별도 목 화면에서 본다 (매칭 번호와 무관한 같은 목 데이터).
        onOpenVisits={() => router.push("/dev/visits")}
        onOpenAlbum={() => router.push("/dev/album")}
        onOpenMap={showDetail}
        onCreateMap={() => onView({ name: "new" })}
        onPickPreviews={(mapId) => onView({ name: "previews", mapId })}
        onOpenMyMaps={showMaps}
      />
    );
  if (view.name === "maps")
    return (
      <MyMapsScreen
        api={api}
        onCreate={() => onView({ name: "new" })}
        onOpenMap={showDetail}
        onAddSpot={(mapId) => onView({ name: "addSpot", mapId })}
        onPickPreviews={(mapId) => onView({ name: "previews", mapId })}
      />
    );
  if (view.name === "new")
    return <NewMapScreen api={api} onBack={showMaps} onCreated={showDetail} />;
  return <DevMapScreen api={api} view={view} onView={onView} />;
}

// 지도 하나를 대상으로 하는 화면들
function DevMapScreen({
  api,
  view,
  onView,
}: DevScreenProps & { view: Extract<DevView, { mapId: number }> }) {
  const { mapId } = view;
  const showDetail = () => onView({ name: "detail", mapId });

  if (view.name === "detail")
    return <DevDetail api={api} mapId={mapId} onView={onView} />;
  if (view.name === "addSpot")
    return (
      <AddSpotFlow
        mapId={mapId}
        api={mockSpotFormApi}
        placeApi={mockPlaces}
        pickPhoto={mockPickPhoto}
        onBack={showDetail}
        onSaved={showDetail}
      />
    );
  if (view.name === "spot")
    return (
      <SpotEditScreen
        mapId={mapId}
        spotId={view.spotId}
        mapApi={api}
        api={mockSpotFormApi}
        pickPhoto={mockPickPhoto}
        onBack={showDetail}
        onDone={showDetail}
        onChangePreviews={() => onView({ name: "previews", mapId })}
      />
    );
  const Target = view.name === "previews" ? PreviewSelectScreen : EditMapScreen;
  return (
    <Target api={api} mapId={mapId} onBack={showDetail} onSaved={showDetail} />
  );
}

function DevDetail({
  api,
  mapId,
  onView,
}: Omit<DevScreenProps, "view"> & { mapId: number }) {
  const showMaps = () => onView({ name: "maps" });
  return (
    <MapDetailScreen
      api={api}
      mapId={mapId}
      onBack={showMaps}
      onAddSpot={() => onView({ name: "addSpot", mapId })}
      onOpenSpot={(spotId) => onView({ name: "spot", mapId, spotId })}
      onPickPreviews={() => onView({ name: "previews", mapId })}
      onEdit={() => onView({ name: "edit", mapId })}
      onDeleted={showMaps}
    />
  );
}
