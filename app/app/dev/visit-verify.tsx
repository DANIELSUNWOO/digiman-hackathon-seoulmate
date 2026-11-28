import { Redirect, useRouter } from "expo-router";
import { useMemo, useState, type ReactElement } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VisitVerifyScreen } from "../../src/features/visit-verify";
import {
  createMockPosition,
  createMockVerifyApi,
  deniedPicker,
  type MockLocation,
  type MockScenario,
  type MockSubmit,
} from "../../src/features/visit-verify/mockApi";
import { theme } from "../../src/theme";
import { Button, Chip, Input } from "../../src/ui";

const SCENARIOS: MockScenario[] = [
  "data",
  "visited",
  "missing",
  "error",
  "denied",
];
const LOCATIONS: MockLocation[] = ["ok", "denied", "off", "unavailable"];
const SUBMITS: MockSubmit[] = ["ok", "far", "uploadFail", "already"];

// 방문 인증 확인용 경로. 코스 지도 없이 들어온다. 개발 빌드에서만 열린다.
export default function DevVisitVerify(): ReactElement {
  const [scenario, setScenario] = useState<MockScenario>("data");
  const [location, setLocation] = useState<MockLocation>("ok");
  const [submit, setSubmit] = useState<MockSubmit>("ok");
  const api = useMemo(
    () => createMockVerifyApi(scenario, submit),
    [scenario, submit],
  );
  const readPosition = useMemo(() => createMockPosition(location), [location]);
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
        <Choices values={SCENARIOS} value={scenario} onChange={setScenario} />
        <Choices
          prefix="위치 "
          values={LOCATIONS}
          value={location}
          onChange={setLocation}
        />
        <Choices
          prefix="제출 "
          values={SUBMITS}
          value={submit}
          onChange={setSubmit}
        />
        <RealRouteEntry />
      </View>
      {/* 시나리오가 바뀌면 화면을 새로 만든다. */}
      <View key={`${scenario}-${submit}`} style={{ flex: 1 }}>
        <VisitVerifyScreen
          api={api}
          pickPhoto={scenario === "denied" ? deniedPicker : undefined}
          readPosition={readPosition}
          matchId={101}
          spotId={31}
          onBack={() => {}}
        />
      </View>
    </SafeAreaView>
  );
}

interface ChoicesProps<T extends string> {
  prefix?: string;
  values: T[];
  value: T;
  onChange: (value: T) => void;
}

function Choices<T extends string>({
  prefix = "",
  values,
  value,
  onChange,
}: ChoicesProps<T>): ReactElement {
  return (
    <>
      {values.map((option) => (
        <Chip
          key={option}
          label={`${prefix}${option}`}
          selected={value === option}
          onPress={() => onChange(option)}
        />
      ))}
    </>
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
