// T-25 인증 완료. 진행률과 채팅 열기 진입은 Q-12에서 붙인다.
import { Check } from "phosphor-react-native";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Button, Label, ScreenFooter } from "../../ui";
import { strings } from "./strings";

export interface VerifyDoneProps {
  onBack: () => void;
}

export function VerifyDone({ onBack }: VerifyDoneProps): ReactElement {
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
      <ScreenFooter>
        <Button label={strings.doneBack} language="ja" onPress={onBack} />
      </ScreenFooter>
    </>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: "center", paddingTop: theme.space.xxl },
});
