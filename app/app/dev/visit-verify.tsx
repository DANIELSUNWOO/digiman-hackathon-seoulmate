import { Redirect, useRouter } from "expo-router";
import { useMemo, useState, type ReactElement } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VisitVerifyScreen } from "../../src/features/visit-verify";
import {
  createMockLocation,
  createMockVerifyApi,
  deniedPicker,
  type MockLocation,
  type MockScenario,
} from "../../src/features/visit-verify/mockApi";
import { theme } from "../../src/theme";
import { Button, Chip, Input, Label } from "../../src/ui";

const SCENARIOS: MockScenario[] = [
  "data",
  "visited",
  "missing",
  "error",
  "denied",
];
const LOCATIONS: MockLocation[] = ["ok", "far", "denied", "off", "unavailable"];

// 방문 인증 확인용 경로. 코스 지도 없이 들어온다. 개발 빌드에서만 열린다.
export default function DevVisitVerify(): ReactElement {
  const [scenario, setScenario] = useState<MockScenario>("data");
  const [submitted, setSubmitted] = useState("-");
  const [location, setLocation] = useState<MockLocation>("ok");
  const mock = useMemo(() => createMockLocation(location), [location]);
  const api = useMemo(() => createMockVerifyApi(scenario), [scenario]);
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surface }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.space.sm,
          paddingHorizontal: theme.space.screen,
        }}
      >
        {SCENARIOS.map((value) => (
          <Chip
            key={value}
            label={value}
            selected={scenario === value}
            onPress={() => setScenario(value)}
          />
        ))}
        {LOCATIONS.map((value) => (
          <Chip
            key={value}
            label={`위치 ${value}`}
            selected={location === value}
            onPress={() => setLocation(value)}
          />
        ))}
        <Label language="ko">{`마지막 제출: ${submitted}`}</Label>
        <RealRouteEntry />
      </View>
      <View key={scenario} style={{ flex: 1 }}>
        <VisitVerifyScreen
          api={api}
          pickPhoto={scenario === "denied" ? deniedPicker : undefined}
          matchId={101}
          spotId={31}
          onBack={() => {}}
          readPosition={mock.readPosition}
          submit={async (draft, position) => {
            await mock.submit(draft, position);
            setSubmitted(draft.review);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

/** 로그인한 상태에서 실서버의 매칭·스팟 번호로 들어간다. */
function RealRouteEntry(): ReactElement {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  const [spotId, setSpotId] = useState("");
  return (
    <>
      <Input
        value={matchId}
        onChangeText={setMatchId}
        placeholder="matchId"
        accessibilityLabel="matchId"
        inputMode="numeric"
      />
      <Input
        value={spotId}
        onChangeText={setSpotId}
        placeholder="spotId"
        accessibilityLabel="spotId"
        inputMode="numeric"
      />
      <Button
        label="실제 경로 열기"
        language="ko"
        secondary
        disabled={!matchId || !spotId}
        onPress={() =>
          router.push(`/visit/verify?matchId=${matchId}&spotId=${spotId}`)
        }
      />
    </>
  );
}
