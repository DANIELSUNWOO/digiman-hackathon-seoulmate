import { useState, type ReactElement } from "react";
import { Image, StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Label } from "../../ui";
import { timeLabel } from "../notifications";
import { TranslatedText, type ViewerLang } from "../translation";
import { strings } from "./strings";
import type { VisitRecord } from "./types";

export interface VisitCardProps {
  visit: VisitRecord;
  lang: ViewerLang;
}

export function VisitCard({ visit, lang }: VisitCardProps): ReactElement {
  return (
    // 공통 Card는 버튼이라 안의 "원문 보기"를 누를 수 없게 될 수 있어 View를 쓴다.
    <View style={styles.card}>
      <VisitPhoto key={visit.photoUrl} visit={visit} lang={lang} />
      <Label weight="bold" language="ko">
        {visit.spot.name}
      </Label>
      <TranslatedText value={visit.review} viewerLang={lang} />
      <Label language={lang}>{timeLabel(visit.verifiedAt)}</Label>
    </View>
  );
}

function VisitPhoto({ visit, lang }: VisitCardProps): ReactElement {
  const [failed, setFailed] = useState(false);
  const text = strings[lang];
  if (failed)
    return (
      <View style={[styles.photo, styles.photoFailed]}>
        <Label center language={lang}>
          {text.photoFailed}
        </Label>
      </View>
    );
  return (
    <Image
      source={{ uri: visit.photoUrl }}
      accessibilityLabel={text.photoLabel(visit.spot.name)}
      onError={() => setFailed(true)}
      style={styles.photo}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.space.sm,
    padding: theme.space.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.white,
  },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.background,
  },
  photoFailed: { alignItems: "center", justifyContent: "center" },
});
