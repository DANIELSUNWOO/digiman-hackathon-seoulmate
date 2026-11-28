// M-20 메이트 홈의 끝난 여행. 누르면 앨범(M-40)으로 간다.
import { useCallback, type ReactElement } from "react";
import { Card, Label } from "../../ui";
import type { MateHomeApi } from "./api";
import { albumTrips, tripLabel } from "./endedTripModel";
import { LoadError } from "./LoadStatus";
import { strings } from "./strings";
import type { EndedMatch } from "./types";
import { useLoad } from "./useLoad";

export interface EndedTripsProps {
  api: MateHomeApi;
  onOpenAlbum: (matchId: number) => void;
}

/** 끝난 여행이 없으면 아무것도 그리지 않는다. api는 참조가 고정돼 있어야 한다. */
export function EndedTrips({
  api,
  onOpenAlbum,
}: EndedTripsProps): ReactElement | null {
  const load = useCallback(() => api.getEndedMatches(), [api]);
  const { state, retry } = useLoad(load);

  if (state.status === "loading") return null;
  const trips = state.status === "ready" ? albumTrips(state.data) : [];
  if (state.status === "ready" && trips.length === 0) return null;
  return (
    <>
      <Label weight="bold" language="ko">
        {strings.endedSection}
      </Label>
      {state.status === "error" && (
        <LoadError error={state.error} onRetry={retry} />
      )}
      {trips.map((trip) => (
        <EndedTripCard
          key={trip.matchId}
          trip={trip}
          onPress={() => onOpenAlbum(trip.matchId)}
        />
      ))}
    </>
  );
}

interface EndedTripCardProps {
  trip: EndedMatch;
  onPress: () => void;
}

function EndedTripCard({ trip, onPress }: EndedTripCardProps): ReactElement {
  const ended =
    trip.status === "COMPLETED" ? strings.tripCompleted : strings.tripExpired;
  return (
    <Card onPress={onPress}>
      <Label weight="bold" language="ja">
        {trip.partner.nickname}
      </Label>
      {trip.courseMap && <Label language="ko">{trip.courseMap.title}</Label>}
      <Label language="ko">
        {trip.trip ? `${tripLabel(trip.trip)} · ${ended}` : ended}
      </Label>
      <Label language="ko" tone="brand">
        {strings.openAlbum}
      </Label>
    </Card>
  );
}
