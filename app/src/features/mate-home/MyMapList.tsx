// M-10 "공개 중 / 만드는 중" 탭과 지도 카드.
import { useCallback, useState, type ReactElement } from "react";
import { Button, Label } from "../../ui";
import { FlatCard } from "./FlatCard";
import { MapListCard } from "./MapListCard";
import { MapTabs, type MapTab } from "./MapTabs";
import { strings } from "./strings";
import { SwipeArea, type SwipeDirection } from "./SwipeArea";
import type { MyMap } from "./types";

export interface MyMapListProps {
  maps: readonly MyMap[];
  onCreate: () => void;
  onOpenMap: (mapId: number) => void;
  onAddSpot: (mapId: number) => void;
  onPickPreviews: (mapId: number) => void;
}

export function MyMapList({
  maps,
  onCreate,
  onOpenMap,
  onAddSpot,
  onPickPreviews,
}: MyMapListProps): ReactElement {
  const [picked, setPicked] = useState<MapTab | null>(null);
  const swipe = useCallback(
    (direction: SwipeDirection) =>
      setPicked(direction === "left" ? "draft" : "published"),
    [],
  );
  if (maps.length === 0) return <NoMaps onCreate={onCreate} />;

  const published = maps.filter((map) => map.isPublic);
  const drafts = maps.filter((map) => !map.isPublic);
  // 고르기 전에는 지도가 있는 쪽을 보여 준다.
  const tab = picked ?? (published.length > 0 ? "published" : "draft");
  const shown = tab === "published" ? published : drafts;
  return (
    <SwipeArea onSwipe={swipe}>
      <MapTabs
        selected={tab}
        counts={{ published: published.length, draft: drafts.length }}
        onSelect={setPicked}
      />
      {shown.length === 0 && (
        <Label center tone="desc" language="ko">
          {tab === "published" ? strings.noPublished : strings.noDraft}
        </Label>
      )}
      {shown.map((map) => (
        <MapListCard
          key={map.mapId}
          map={map}
          onOpen={() => onOpenMap(map.mapId)}
          onAddSpot={() => onAddSpot(map.mapId)}
          onPickPreviews={() => onPickPreviews(map.mapId)}
        />
      ))}
    </SwipeArea>
  );
}

/** 지도가 하나도 없을 때는 머리의 + 말고도 만들 수 있게 한다. */
function NoMaps({ onCreate }: { onCreate: () => void }): ReactElement {
  return (
    <FlatCard>
      <Label center language="ko">
        {strings.mapsEmpty}
      </Label>
      <Button
        label={strings.createMap}
        language="ko"
        secondary
        onPress={onCreate}
      />
    </FlatCard>
  );
}
