import { Redirect } from "expo-router";
import { useState, type ReactElement } from "react";
import { View } from "react-native";
import {
  TranslatedText,
  type Translated,
  type ViewerLang,
} from "../../src/features/translation";
import { theme } from "../../src/theme";
import { Card, Chip, Label, Screen } from "../../src/ui";

const SAMPLES: { name: string; value: Translated }[] = [
  {
    name: "한국어 글, 번역 있음",
    value: {
      original: "창가 자리에서 혼자 오래 있어도 눈치가 안 보여요",
      translated: "窓際の席なら一人で長くいても気になりません",
      sourceLang: "ko",
    },
  },
  {
    name: "일본어 글, 번역 있음",
    value: {
      original: "雰囲気がとても良かったです",
      translated: "분위기가 정말 좋았어요",
      sourceLang: "ja",
    },
  },
  {
    name: "번역 실패 (null)",
    value: {
      original: "오전 10시 전에 가면 한적해요",
      translated: null,
      sourceLang: "ko",
    },
  },
];

// 번역 표시 컴포넌트 확인용 경로. 개발 빌드에서만 열린다.
export default function DevTranslatedText(): ReactElement {
  const [viewerLang, setViewerLang] = useState<ViewerLang>("ja");
  const [cardPresses, setCardPresses] = useState(0);
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Screen>
      <View style={{ flexDirection: "row", gap: theme.space.sm }}>
        <Chip
          label="ja"
          selected={viewerLang === "ja"}
          onPress={() => setViewerLang("ja")}
        />
        <Chip
          label="ko"
          selected={viewerLang === "ko"}
          onPress={() => setViewerLang("ko")}
        />
      </View>
      {SAMPLES.map(({ name, value }) => (
        <View key={name}>
          <Label weight="bold" language="ko">
            {name}
          </Label>
          <TranslatedText value={value} viewerLang={viewerLang} />
        </View>
      ))}
      {/*
        토글이 카드까지 누르지 않는지 확인한다.
        공통 Card가 항상 버튼이라 웹에서는 button 중첩 경고가 난다.
      */}
      <Card onPress={() => setCardPresses((count) => count + 1)}>
        <Label language="ko">{`카드 눌림 ${cardPresses}회`}</Label>
        <TranslatedText value={SAMPLES[0].value} viewerLang={viewerLang} />
      </Card>
    </Screen>
  );
}
