// T-23 / F-UI-11 방문 인증 작성.
import type { ReactElement } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { theme } from "../../theme";
import { AppBar, Button, ErrorNotice, Label, Notice, Screen } from "../../ui";
import { visitVerifyApi, type VisitVerifyApi } from "./api";
import { errorText } from "./errors";
import { pickPhoto as pickFromDevice } from "./photo";
import { strings } from "./strings";
import type { CourseSpot, PickPhoto, VisitDraft } from "./types";
import { useSpot, type SpotLoad } from "./useSpot";
import { VerifyForm } from "./VerifyForm";

export interface VisitVerifyScreenProps {
  api?: VisitVerifyApi;
  pickPhoto?: PickPhoto;
  matchId: number;
  spotId: number;
  onBack: () => void;
  onSubmit: (draft: VisitDraft) => void;
}

export function VisitVerifyScreen({
  api = visitVerifyApi,
  pickPhoto = pickFromDevice,
  matchId,
  spotId,
  onBack,
  onSubmit,
}: VisitVerifyScreenProps): ReactElement {
  const load = useSpot(api, matchId, spotId);

  return (
    <KeyboardAvoidingView
      // 후기 입력창이 키보드에 가리지 않게 한다.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboard}
    >
      <Screen>
        <AppBar
          title={strings.title}
          language="ja"
          backLabel={strings.back}
          onBack={onBack}
        />
        <SpotBody load={load} pickPhoto={pickPhoto} onSubmit={onSubmit} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

interface SpotBodyProps {
  load: SpotLoad;
  pickPhoto: PickPhoto;
  onSubmit: (draft: VisitDraft) => void;
}

function SpotBody({ load, ...form }: SpotBodyProps): ReactElement {
  const { state, retry } = load;
  if (state.status === "loading")
    return (
      <ActivityIndicator
        accessibilityLabel={strings.loading}
        color={theme.color.brandDeep}
      />
    );
  if (state.status === "error")
    return (
      <>
        <ErrorNotice language="ja">
          {errorText(state.error, strings.errorLoad)}
        </ErrorNotice>
        <Button label={strings.retry} language="ja" secondary onPress={retry} />
      </>
    );
  if (state.spot === null)
    return <Notice language="ja">{strings.spotMissing}</Notice>;
  return (
    <>
      <SpotHeader spot={state.spot} />
      {state.spot.visited ? (
        <Notice language="ja">{strings.alreadyVisited}</Notice>
      ) : (
        <VerifyForm {...form} />
      )}
    </>
  );
}

function SpotHeader({ spot }: { spot: CourseSpot }): ReactElement {
  return (
    <>
      {/* 스팟 이름은 서버가 한국어로 내려준다. */}
      <Label language="ko" weight="bold">
        {spot.name}
      </Label>
      <Label language="ja" variant="desc" tone="desc">
        {strings.subtitle}
      </Label>
    </>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
});
