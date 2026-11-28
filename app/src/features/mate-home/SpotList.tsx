// 지도 상세의 스팟 목록
import type { ReactElement } from "react";
import { Card, Label } from "../../ui";
import { strings } from "./strings";
import type { MapSpot } from "./types";

export interface SpotListProps {
  spots: MapSpot[];
  /** 없으면 누를 수 없다. */
  onOpenSpot?: (spotId: number) => void;
}

export function SpotList({ spots, onOpenSpot }: SpotListProps): ReactElement {
  return (
    <>
      <Label weight="bold" language="ko">
        {strings.spotSection}
      </Label>
      {spots.length === 0 && <Label language="ko">{strings.spotEmpty}</Label>}
      {spots.map((spot) => (
        <Card
          key={spot.spotId}
          onPress={onOpenSpot && (() => onOpenSpot(spot.spotId))}
        >
          <SpotSummary spot={spot} />
        </Card>
      ))}
    </>
  );
}

function SpotSummary({ spot }: { spot: MapSpot }): ReactElement {
  return (
    <>
      <Label weight="bold" language="ko">
        {spot.name}
      </Label>
      {!!spot.address && <Label language="ko">{spot.address}</Label>}
      {!!spot.review?.original && (
        <Label language="ko">{strings.spotReview(spot.review.original)}</Label>
      )}
      {!!spot.reason?.original && (
        <Label language="ko">{strings.spotReason(spot.reason.original)}</Label>
      )}
      {spot.isPreview && (
        <Label weight="medium" language="ko">
          {strings.spotPreview}
        </Label>
      )}
    </>
  );
}
