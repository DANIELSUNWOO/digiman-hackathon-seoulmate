// T-25 인증 완료. 채팅 열기(T-27) 화면이 생기면 진입 버튼을 붙인다.
import { Check } from "phosphor-react-native";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Button, Card, Label, ScreenFooter } from "../../ui";
import { strings } from "./strings";
import type { Progress } from "./types";
import { VisitProgress } from "./VisitProgress";

export interface VerifyDoneProps {
  progress: Progress;
  onBack: () => void;
}

export function VerifyDone({
  progress,
  onBack,
}: VerifyDoneProps): ReactElement {
  return (
    <>
      <View style={styles.icon}>
        <Check size={44} color={theme.color.positive} />
      </View>
      <Label language="ja" title center>
        {strings.doneTitle}
      </Label>
      <Label language="ja" variant="desc" center>
        {strings.doneBody}
      </Label>
      <Card>
        <VisitProgress progress={progress} />
      </Card>
      <ScreenFooter>
        <Button label={strings.doneBack} language="ja" onPress={onBack} />
      </ScreenFooter>
    </>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: "center", paddingTop: theme.space.xxl },
});
