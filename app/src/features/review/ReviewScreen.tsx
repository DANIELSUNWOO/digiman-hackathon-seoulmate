// T-32 메이트 상호 후기 / M-41 여행자 상호 후기
import type { ReactElement } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { theme } from "../../theme";
import { AppBar, Button, ErrorNotice, Screen } from "../../ui";
import { reviewApi, type ReviewApi } from "./api";
import { errorText } from "./errors";
import { ReviewContent } from "./ReviewContent";
import { reviewStrings, type ReviewStrings } from "./strings";
import type { ReviewerRole } from "./types";
import { useReviews } from "./useReviews";

export interface ReviewScreenProps {
  api?: ReviewApi;
  matchId: number;
  /** 보는 사람. 이미 쓴 후기를 가려낸다. */
  userId: string;
  role: ReviewerRole;
  onBack: () => void;
}

export function ReviewScreen({
  api = reviewApi,
  matchId,
  userId,
  role,
  onBack,
}: ReviewScreenProps): ReactElement {
  const text = reviewStrings[role];
  return (
    <KeyboardAvoidingView
      // 후기 입력창이 키보드에 가리지 않게 한다.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboard}
    >
      <Screen>
        <AppBar
          title={text.title}
          language={text.lang}
          backLabel={text.back}
          onBack={onBack}
        />
        <ReviewBody api={api} matchId={matchId} userId={userId} text={text} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

interface ReviewBodyProps {
  api: ReviewApi;
  matchId: number;
  userId: string;
  text: ReviewStrings;
}

function ReviewBody(props: ReviewBodyProps): ReactElement {
  const { api, matchId, text } = props;
  const { state, retry, refresh, add } = useReviews(api, matchId);
  if (state.status === "loading")
    return (
      <ActivityIndicator
        accessibilityLabel={text.loading}
        color={theme.color.brandDeep}
      />
    );
  if (state.status === "error")
    return (
      <>
        <ErrorNotice language={text.lang}>
          {errorText(state.error, text, text.errorLoad)}
        </ErrorNotice>
        <Button
          label={text.retry}
          language={text.lang}
          secondary
          onPress={retry}
        />
      </>
    );
  return (
    <ReviewContent {...props} reviews={state.reviews} load={{ add, refresh }} />
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
});
