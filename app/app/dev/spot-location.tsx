import { Redirect } from "expo-router";
import { useState, type ReactElement } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createMockPlaceSearchApi } from "../../src/features/place-search/mockApi";
import { SpotLocationScreen } from "../../src/features/spot-location";
import { theme } from "../../src/theme";
import { Label } from "../../src/ui";

const api = createMockPlaceSearchApi("data");

// 스팟 위치 선택 확인용 경로. 로그인과 서버 없이 목 데이터로 본다. 개발 빌드에서만 열린다.
export default function DevSpotLocation(): ReactElement {
  const [picked, setPicked] = useState<string[]>([]);
  const [backCount, setBackCount] = useState(0);
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.white }}>
      <View style={{ paddingHorizontal: theme.space.screen }}>
        <Label language="ko">{`넘겨받은 값 ${picked.length}건: ${picked.at(-1) ?? "-"}`}</Label>
        <Label language="ko">{`뒤로 ${backCount}회`}</Label>
      </View>
      <View style={{ flex: 1 }}>
        <SpotLocationScreen
          api={api}
          onBack={() => setBackCount((count) => count + 1)}
          onPicked={(location) =>
            setPicked((previous) => [...previous, JSON.stringify(location)])
          }
        />
      </View>
    </SafeAreaView>
  );
}
