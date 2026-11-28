// M-12b 확인 시트. 검색 결과의 이름은 고칠 수 있고 주소·좌표는 그대로 쓴다.
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { BottomSheet, Button, Input, Label } from "../../ui";
import { strings } from "./strings";
import { NAME_MAX, type SpotDraft } from "./useSpotDraft";

export interface SpotConfirmSheetProps {
  spot: SpotDraft;
}

export function SpotConfirmSheet({
  spot,
}: SpotConfirmSheetProps): ReactElement {
  const { draft, visible, rename, confirm, cancel, dismissed } = spot;
  return (
    <BottomSheet visible={visible} onClose={cancel} onDismissed={dismissed}>
      {draft && (
        // 공용 시트는 항목 사이 간격이 없다.
        <View style={styles.content}>
          <Label variant="sheetTitle" language="ko">
            {strings.confirmTitle}
          </Label>
          <Label weight="bold" language="ko">
            {strings.nameField}
          </Label>
          <Input
            language="ko"
            accessibilityLabel={strings.nameField}
            value={draft.name}
            onChangeText={rename}
            maxLength={NAME_MAX}
          />
          {draft.address !== null && (
            <Label language="ko" variant="desc">
              {draft.address}
            </Label>
          )}
          <Button
            label={strings.confirm}
            language="ko"
            disabled={!draft.name.trim()}
            onPress={confirm}
          />
          <Button
            label={strings.cancel}
            language="ko"
            secondary
            onPress={cancel}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.space.md },
});
