// T-23 / F-UI-11 방문 인증 작성.
import { useState, type ReactElement } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { theme } from "../../theme";
import { AppBar, Button, ErrorNotice, Label, Notice, Screen } from "../../ui";
import { pickPhoto as pickFromDevice, type PickPhoto } from "../photo-upload";
import { visitVerifyApi, type VisitVerifyApi } from "./api";
import { errorText } from "./errors";
import { readPosition as readFromDevice } from "./location";
import { strings } from "./strings";
import { createSubmit } from "./submission";
import type { ReadPosition, SubmitVisit } from "./types";
import { useSpot, type SpotLoad } from "./useSpot";
import { VerifyForm } from "./VerifyForm";

export interface VisitVerifyScreenProps {
  api?: VisitVerifyApi;
  pickPhoto?: PickPhoto;
  readPosition?: ReadPosition;
  matchId: number;
  spotId: number;
  /** 뒤로 가기와 인증 완료 뒤 "코스로 돌아가기"에 쓴다. */
  onBack: () => void;
}

export function VisitVerifyScreen({
  api = visitVerifyApi,
  pickPhoto = pickFromDevice,
  readPosition = readFromDevice,
  matchId,
  spotId,
  onBack,
}: VisitVerifyScreenProps): ReactElement {
  const load = useSpot(api, matchId, spotId);
  // 올린 사진을 기억해야 해서 화면이 살아 있는 동안 하나만 만든다.
  // 매칭이나 스팟이 바뀌면 부르는 쪽이 key로 다시 만든다.
  const [submit] = useState(() => createSubmit(api, matchId, spotId));

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
        <SpotBody
          load={load}
          pickPhoto={pickPhoto}
          readPosition={readPosition}
          submit={submit}
          onDone={onBack}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

interface SpotBodyProps {
  load: SpotLoad;
  pickPhoto: PickPhoto;
  readPosition: ReadPosition;
  submit: SubmitVisit;
  onDone: () => void;
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
      {/* 스팟 이름은 서버가 한국어로 내려준다. */}
      <Label language="ko" weight="bold">
        {state.spot.name}
      </Label>
      {state.spot.visited ? (
        <Notice language="ja">{strings.alreadyVisited}</Notice>
      ) : (
        <VerifyForm {...form} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
});
