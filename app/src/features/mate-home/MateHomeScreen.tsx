// M-20 메이트 홈: 매칭 현황과 여행자 목록. 알림(NOTI-02)은 Q-15에서 붙인다.
import { useCallback } from "react";
import { Card, Label, Screen } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { LoadError, Loading } from "./LoadStatus";
import { progressLabel, sortByLastVisit, visitTimeLabel } from "./model";
import { strings } from "./strings";
import type { MatchItem, MateProfile } from "./types";
import { useLoad } from "./useLoad";

export function MateHomeScreen({ api = mateHomeApi }: { api?: MateHomeApi }) {
  const load = useCallback(
    () => Promise.all([api.getProfile(), api.getActiveMatches()]),
    [api],
  );
  const { state, retry } = useLoad(load);

  return (
    <Screen>
      <Label title language="ko">
        {strings.homeTitle}
      </Label>
      {state.status === "loading" && <Loading />}
      {state.status === "error" && (
        <LoadError error={state.error} onRetry={retry} />
      )}
      {state.status === "ready" && (
        <MatchList profile={state.data[0]} matches={state.data[1]} />
      )}
    </Screen>
  );
}

function MatchList({
  profile,
  matches,
}: {
  profile: MateProfile;
  matches: MatchItem[];
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
      {/* 방문 기록 화면(Q-13)이 생기면 카드에 이동을 붙인다. */}
      {sortByLastVisit(matches).map((match) => (
        <Card key={match.matchId}>
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
