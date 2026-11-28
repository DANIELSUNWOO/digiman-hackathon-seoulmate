// M-20 메이트 홈: 매칭 현황과 여행자 목록.
import { useCallback, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Label, Screen } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { LoadError, Loading } from "./LoadStatus";
import { progressLabel, sortByLastVisit, visitTimeLabel } from "./model";
import { strings } from "./strings";
import type { MatchItem, MateProfile } from "./types";
import { useLoad } from "./useLoad";

export interface MateHomeScreenProps {
  api?: MateHomeApi;
  /** 제목 오른쪽에 둘 것 (알림 종) */
  headerRight?: ReactNode;
  onOpenVisits: (matchId: number) => void;
}

export function MateHomeScreen({
  api = mateHomeApi,
  headerRight,
  onOpenVisits,
}: MateHomeScreenProps) {
  const load = useCallback(
    () => Promise.all([api.getProfile(), api.getActiveMatches()]),
    [api],
  );
  const { state, retry } = useLoad(load);

  return (
    <Screen>
      <View style={styles.header}>
        <Label title language="ko">
          {strings.homeTitle}
        </Label>
        {headerRight}
      </View>
      {state.status === "loading" && <Loading />}
      {state.status === "error" && (
        <LoadError error={state.error} onRetry={retry} />
      )}
      {state.status === "ready" && (
        <MatchList
          profile={state.data[0]}
          matches={state.data[1]}
          onOpenVisits={onOpenVisits}
        />
      )}
    </Screen>
  );
}

function MatchList({
  profile,
  matches,
  onOpenVisits,
}: {
  profile: MateProfile;
  matches: MatchItem[];
  onOpenVisits: (matchId: number) => void;
}) {
  const capacity = profile.matchCapacity;
  return (
    <>
      <Label weight="bold" language="ko">
        {capacity
          ? `${strings.matchSection} ${capacity.active} / ${capacity.max}`
          : strings.matchSection}
      </Label>
      {matches.length === 0 && (
        <Label language="ko">{strings.matchEmpty}</Label>
      )}
      {sortByLastVisit(matches).map((match) => (
        <Card key={match.matchId} onPress={() => onOpenVisits(match.matchId)}>
          <Label weight="bold" language="ja">
            {match.partner.nickname}
          </Label>
          {match.courseMap && (
            <Label language="ko">{match.courseMap.title}</Label>
          )}
          <Label language="ko">{progressLabel(match)}</Label>
          <Label language="ko">{visitTimeLabel(match.lastVisitAt)}</Label>
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
