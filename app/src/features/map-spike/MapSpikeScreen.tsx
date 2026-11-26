// Q-01 지도 SDK 검증용 임시 화면. 공통 지도 컴포넌트(Q-02)가 생기면 지운다.
import {
  addNaverMapAuthFailureListener,
  NaverMapMarkerOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRole } from "../../state";
import { theme } from "../../theme";
import { Button, Label } from "../../ui";

const INITIAL_CAMERA = { latitude: 37.5446, longitude: 127.0487, zoom: 13 };

const PINS = [
  { id: "seongsu", title: "성수역", latitude: 37.5446, longitude: 127.0557 },
  {
    id: "seoulforest",
    title: "서울숲",
    latitude: 37.5444,
    longitude: 127.0374,
  },
  { id: "ttukseom", title: "뚝섬역", latitude: 37.5474, longitude: 127.0473 },
];

type MapLanguage = "ko" | "ja";

export function MapSpikeScreen({ onBack }: { onBack: () => void }) {
  const { role } = useRole();
  const mapRef = useRef<NaverMapViewRef>(null);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<MapLanguage>(
    role === "traveler" ? "ja" : "ko",
  );
  const [message, setMessage] = useState("핀을 눌러 보세요");

  // 인증 실패는 다시 전달되지 않으므로 지도를 그리기 전에 구독한다.
  useEffect(() => {
    const subscription = addNaverMapAuthFailureListener((failure) => {
      setMessage(`지도 인증 실패 (${failure.code})`);
    });
    const frame = requestAnimationFrame(() => setIsListening(true));
    return () => {
      cancelAnimationFrame(frame);
      subscription.remove();
    };
  }, []);

  const showMyLocation = async () => {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setMessage("위치 권한이 거부됐습니다");
        return;
      }
      mapRef.current?.setLocationTrackingMode("Follow");
      setMessage("현재 위치를 표시합니다");
    } catch {
      setMessage("위치를 가져오지 못했습니다");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {isListening && (
        <NaverMapView
          ref={mapRef}
          style={styles.map}
          initialCamera={INITIAL_CAMERA}
          locale={language}
        >
          {PINS.map((pin) => (
            <NaverMapMarkerOverlay
              key={pin.id}
              latitude={pin.latitude}
              longitude={pin.longitude}
              caption={{ text: pin.title }}
              onTap={() => setMessage(`선택: ${pin.title}`)}
            />
          ))}
        </NaverMapView>
      )}
      <View style={styles.panel}>
        <Label language="ko">{message}</Label>
        <Button label="현재 위치" language="ko" onPress={showMyLocation} />
        <Button
          label={language === "ko" ? "지도 언어: 한국어" : "地図の言語: 日本語"}
          language={language}
          secondary
          onPress={() => setLanguage(language === "ko" ? "ja" : "ko")}
        />
        <Button label="뒤로" language="ko" secondary onPress={onBack} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.white },
  map: { flex: 1 },
  panel: { padding: theme.space.lg, gap: theme.space.sm },
});
