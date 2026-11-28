// M-10 "공개 중 / 만드는 중" 탭과 지도 카드.
import { useCallback, useState, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Button, Chip, Label } from "../../ui";
import { MapListCard } from "./MapListCard";
import { strings } from "./strings";
import { SwipeArea, type SwipeDirection } from "./SwipeArea";
import type { MyMap } from "./types";

type MapTab = "published" | "draft";

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

interface MapTabsProps {
  selected: MapTab;
  counts: Record<MapTab, number>;
  onSelect: (tab: MapTab) => void;
}

function MapTabs({ selected, counts, onSelect }: MapTabsProps): ReactElement {
  return (
    <View style={styles.tabs}>
      <Chip
        label={`${strings.published} ${counts.published}`}
        language="ko"
        selected={selected === "published"}
        onPress={() => onSelect("published")}
      />
      <Chip
        label={`${strings.drafting} ${counts.draft}`}
        language="ko"
        selected={selected === "draft"}
        onPress={() => onSelect("draft")}
      />
    </View>
  );
}

/** 지도가 하나도 없을 때는 머리의 + 말고도 만들 수 있게 한다. */
function NoMaps({ onCreate }: { onCreate: () => void }): ReactElement {
  return (
    <>
      <Label center language="ko">
        {strings.mapsEmpty}
      </Label>
      <Button
        label={strings.createMap}
        language="ko"
        secondary
        onPress={onCreate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: theme.space.sm },
});
