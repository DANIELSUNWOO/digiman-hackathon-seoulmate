import type { ReactElement } from "react";
import { LoadingSkeleton } from "../../loading";
import { Button, Card, ErrorNotice, Label } from "../../ui";
import { errorMessage } from "./errors";
import { strings } from "./strings";
import type { PlaceResult } from "./types";
import type { SearchState } from "./usePlaceSearch";

export interface PlaceResultsProps {
  state: SearchState;
  onSelect: (place: PlaceResult) => void;
  onRetry: () => void;
}

export function PlaceResults({
  state,
  onSelect,
  onRetry,
}: PlaceResultsProps): ReactElement {
  if (state.status === "loading")
    return <LoadingSkeleton label={strings.loading} shape="rows" />;
  if (state.status === "error")
    return (
      <>
        <ErrorNotice language="ko">{errorMessage(state.error)}</ErrorNotice>
        <Button
          label={strings.retry}
          language="ko"
          secondary
          onPress={onRetry}
        />
      </>
    );
  if (state.status === "idle" || state.places.length === 0)
    return (
      <Label center language="ko" tone="desc">
        {state.status === "idle" ? strings.hint : strings.empty}
      </Label>
    );
  return (
    <>
      {state.places.map((place, index) => (
        // 이름과 좌표가 같은 결과가 있을 수 있어 순서를 함께 쓴다.
        <PlaceCard
          key={`${index}-${place.name}`}
          place={place}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

interface PlaceCardProps {
  place: PlaceResult;
  onSelect: (place: PlaceResult) => void;
}

function PlaceCard({ place, onSelect }: PlaceCardProps): ReactElement {
  return (
    <Card onPress={() => onSelect(place)}>
      <Label weight="bold" language="ko">
        {place.name}
      </Label>
      {place.category !== null && (
        <Label language="ko" variant="caption" tone="desc">
          {place.category}
        </Label>
      )}
      {place.address !== null && (
        <Label language="ko" variant="desc">
          {place.address}
        </Label>
      )}
    </Card>
  );
}
