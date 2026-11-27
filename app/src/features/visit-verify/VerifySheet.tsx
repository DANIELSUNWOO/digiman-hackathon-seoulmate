// T-24 위치 확인 / T-19 실패.
import { MapPinArea, WarningCircle } from "phosphor-react-native";
import type { ReactElement } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { theme } from "../../theme";
import { BottomSheet, Button, Label, Notice } from "../../ui";
import { failureCopy, type FailureCopy } from "./failure";
import { strings } from "./strings";
import type { Verification } from "./useVerification";

export interface VerifySheetProps {
  state: Verification;
  onRetry: () => void;
  onClose: () => void;
}

export function VerifySheet({
  state,
  onRetry,
  onClose,
}: VerifySheetProps): ReactElement {
  return (
    <BottomSheet visible={state.status !== "idle"} onClose={onClose}>
      <View style={styles.sheet}>
        {(state.status === "locating" || state.status === "sending") && (
          <Progress sending={state.status === "sending"} />
        )}
        {(state.status === "noLocation" || state.status === "failed") && (
          <Failure
            copy={failureCopy(state)}
            onRetry={onRetry}
            onClose={onClose}
          />
        )}
      </View>
    </BottomSheet>
  );
}

function Progress({ sending }: { sending: boolean }): ReactElement {
  return (
    <>
      <ActivityIndicator color={theme.color.brandDeep} />
      <Label language="ja" weight="bold" center>
        {sending ? strings.sending : strings.checking}
      </Label>
      {!sending && (
        <Label language="ja" variant="desc" tone="desc" center>
          {strings.checkingBody}
        </Label>
      )}
    </>
  );
}

interface FailureProps {
  copy: FailureCopy;
  onRetry: () => void;
  onClose: () => void;
}

function Failure({ copy, onRetry, onClose }: FailureProps): ReactElement {
  // 웹에는 앱 설정 화면이 없다.
  const openSettings = copy.settings && Platform.OS !== "web";
  const Icon = copy.far ? MapPinArea : WarningCircle;
  return (
    <>
      <View style={styles.icon}>
        <Icon size={32} color={theme.color.dangerPress} />
      </View>
      <Label language="ja" weight="bold" center>
        {copy.title}
      </Label>
      <Label language="ja" variant="desc" center>
        {copy.body}
      </Label>
      <Notice language="ja">{strings.draftKept}</Notice>
      {openSettings && (
        <Button
          label={strings.openSettings}
          language="ja"
          onPress={() => void Linking.openSettings()}
        />
      )}
      {copy.retry && (
        <Button
          label={strings.tryAgain}
          language="ja"
          secondary={openSettings}
          onPress={onRetry}
        />
      )}
      <Button label={strings.later} language="ja" secondary onPress={onClose} />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: theme.space.md },
  icon: { alignItems: "center" },
});
