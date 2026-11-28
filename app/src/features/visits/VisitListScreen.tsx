// M-23 / F-UI-17 방문 기록 목록. 리액션·댓글은 Q-14에서 붙인다.
import type { ReactElement } from "react";
import { ActivityIndicator } from "react-native";
import { theme } from "../../theme";
import { Button, Label, Screen } from "../../ui";
import type { ViewerLang } from "../translation";
import { visitsApi, type VisitsApi } from "./api";
import { errorText } from "./model";
import { strings } from "./strings";
import type { VisitRecord } from "./types";
import { useVisits } from "./useVisits";
import { VisitCard } from "./VisitCard";

export interface VisitListScreenProps {
  api?: VisitsApi;
  matchId: number;
  lang: ViewerLang;
  onBack: () => void;
}

export function VisitListScreen({
  api = visitsApi,
  matchId,
  lang,
  onBack,
}: VisitListScreenProps): ReactElement {
  const { state, retry } = useVisits(api, matchId);
  const text = strings[lang];

  return (
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
        <>
          <Label center language={lang}>
            {errorText(state.error, text, text.errorLoad)}
          </Label>
          <Button
            label={text.retry}
            language={lang}
            secondary
            onPress={retry}
          />
        </>
      )}
      {state.status === "ready" && (
        <VisitList
          visits={state.visits}
          refreshError={state.refreshError}
          lang={lang}
        />
      )}
    </Screen>
  );
}

interface VisitListProps {
  visits: VisitRecord[];
  refreshError: unknown;
  lang: ViewerLang;
}

function VisitList({
  visits,
  refreshError,
  lang,
}: VisitListProps): ReactElement {
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
        <VisitCard key={visit.visitId} visit={visit} lang={lang} />
      ))}
    </>
  );
}
