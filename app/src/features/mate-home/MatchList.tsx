// M-20 진행 중인 여행자 목록.
import type { ReactElement } from "react";
import { Card, Label } from "../../ui";
import { tripLabel } from "./endedTripModel";
import { progressLabel, sortByLastVisit, visitTimeLabel } from "./model";
import type { MatchItem } from "./types";

export interface MatchListProps {
  matches: readonly MatchItem[];
  onOpenVisits: (matchId: number) => void;
}

export function MatchList({
  matches,
  onOpenVisits,
}: MatchListProps): ReactElement {
  return (
    <>
      {sortByLastVisit(matches).map((match) => (
        <MatchCard
          key={match.matchId}
          match={match}
          onPress={() => onOpenVisits(match.matchId)}
        />
      ))}
    </>
  );
}

interface MatchCardProps {
  match: MatchItem;
  onPress: () => void;
}

function MatchCard({ match, onPress }: MatchCardProps): ReactElement {
  return (
    <Card onPress={onPress}>
      <Label weight="bold" language="ja">
        {match.partner.nickname}
      </Label>
      {match.trip && <Label language="ko">{tripLabel(match.trip)}</Label>}
      <Label language="ko">{progressLabel(match)}</Label>
      <Label language="ko">{visitTimeLabel(match.lastVisitAt)}</Label>
    </Card>
  );
}
