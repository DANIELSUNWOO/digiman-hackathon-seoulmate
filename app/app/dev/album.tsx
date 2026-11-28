import { Redirect, useRouter } from "expo-router";
import { useMemo, useState, type ReactElement } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlbumScreen } from "../../src/features/album";
import {
  createMockAlbumApi,
  type MockAlbum,
} from "../../src/features/album/mockApi";
import { theme } from "../../src/theme";
import { Button, Chip, Input } from "../../src/ui";

const SCENARIOS: MockAlbum[] = ["data", "long", "empty", "notFound", "error"];

// 앨범 확인용 경로. 끝난 매칭 없이 들어온다. 개발 빌드에서만 열린다.
export default function DevAlbum(): ReactElement {
  const [scenario, setScenario] = useState<MockAlbum>("data");
  const [isMate, setIsMate] = useState(false);
  const [pressed, setPressed] = useState("");
  const api = useMemo(() => createMockAlbumApi(scenario), [scenario]);
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
        {SCENARIOS.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={scenario === option}
            onPress={() => setScenario(option)}
          />
        ))}
        <Chip
          label={`메이트 ${pressed}`}
          selected={isMate}
          onPress={() => setIsMate((value) => !value)}
        />
        <RealRouteEntry />
      </View>
      {/* 시나리오가 바뀌면 화면을 새로 만든다. */}
      <View key={`${scenario}-${isMate}`} style={{ flex: 1 }}>
        <AlbumScreen
          api={api}
          matchId={101}
          lang={isMate ? "ko" : "ja"}
          isMate={isMate}
          onBack={() => {}}
          onReport={({ targetType, targetId }) =>
            setPressed(`· 신고 ${targetType} ${targetId}`)
          }
        />
      </View>
    </SafeAreaView>
  );
}

/** 로그인한 상태에서 실서버의 매칭 번호로 들어간다. */
function RealRouteEntry(): ReactElement {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  return (
    <>
      <Input
        value={matchId}
        onChangeText={setMatchId}
        placeholder="matchId"
        accessibilityLabel="matchId"
        inputMode="numeric"
      />
      <Button
        label="실제 경로 열기"
        language="ko"
        secondary
        disabled={!matchId}
        onPress={() => router.push(`/matches/${matchId}/album`)}
      />
    </>
  );
}
