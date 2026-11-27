// M-23 / F-UI-17 방문 기록 목록과 리액션·댓글.
import type { ReactElement } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { theme } from "../../theme";
import { Button, Label, Screen } from "../../ui";
import type { ViewerLang } from "../translation";
import { visitsApi, type VisitsApi } from "./api";
import { errorText } from "./errors";
import { strings } from "./strings";
import type { ReportTarget, VisitRecord } from "./types";
import { useVisitActions, type VisitActions } from "./useVisitActions";
import { useVisits } from "./useVisits";
import { VisitCard } from "./VisitCard";

export interface VisitListScreenProps {
  api?: VisitsApi;
  matchId: number;
  lang: ViewerLang;
  /** 메이트면 리액션·댓글을 남길 수 있다. */
  canWrite: boolean;
  onBack: () => void;
  onReport?: (target: ReportTarget) => void;
}

export function VisitListScreen({
  api = visitsApi,
  matchId,
  lang,
  canWrite,
  onBack,
  onReport,
}: VisitListScreenProps): ReactElement {
  const { state, retry, write, updateVisit } = useVisits(api, matchId);
  const actions = useVisitActions(api, write, updateVisit);
  const text = strings[lang];

  return (
    <KeyboardAvoidingView
      // 댓글 입력창이 키보드에 가리지 않게 한다.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboard}
    >
      <Screen>
        <Button label={text.back} language={lang} secondary onPress={onBack} />
        <Label title language={lang}>
          {text.title}
        </Label>
        {state.status === "loading" && (
          <ActivityIndicator
            accessibilityLabel={text.loading}
            color={theme.color.mainInk}
          />
        )}
        {state.status === "error" && (
          <LoadError error={state.error} lang={lang} onRetry={retry} />
        )}
        {state.status === "ready" && (
          <VisitList
            visits={state.visits}
            refreshError={state.refreshError}
            lang={lang}
            canWrite={canWrite}
            actions={actions}
            onReport={onReport}
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

interface LoadErrorProps {
  error: unknown;
  lang: ViewerLang;
  onRetry: () => void;
}

function LoadError({ error, lang, onRetry }: LoadErrorProps): ReactElement {
  const text = strings[lang];
  return (
    <>
      <Label center language={lang}>
        {errorText(error, text, text.errorLoad)}
      </Label>
      <Button label={text.retry} language={lang} secondary onPress={onRetry} />
    </>
  );
}

interface VisitListProps {
  visits: VisitRecord[];
  refreshError: unknown;
  lang: ViewerLang;
  canWrite: boolean;
  actions: VisitActions;
  onReport?: (target: ReportTarget) => void;
}

function VisitList({
  visits,
  refreshError,
  ...card
}: VisitListProps): ReactElement {
  const { lang } = card;
  const text = strings[lang];
  return (
    <>
      {refreshError !== null && (
        <Label center language={lang}>
          {errorText(refreshError, text, text.errorRefresh)}
        </Label>
      )}
      {visits.length === 0 && (
        <Label center language={lang}>
          {text.empty}
        </Label>
      )}
      {visits.map((visit) => (
        <VisitCard key={visit.visitId} visit={visit} {...card} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
});
