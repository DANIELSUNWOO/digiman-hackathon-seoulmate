// M-20에서 매칭이 없을 때: 기다리면 되는지, 지도를 마저 만들어야 하는지 알려 준다.
import { MapPin, MapTrifold, type Icon } from "phosphor-react-native";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Button, Card, Label } from "../../ui";
import { MAP_MIN_SPOTS, MAP_PREVIEW_SPOTS } from "./model";
import { strings } from "./strings";
import type { MyMap } from "./types";

/** 노출 중인 지도가 있고 매칭만 없을 때 */
export function WaitingForMatch({
  onOpenMyMaps,
}: {
  onOpenMyMaps: () => void;
}): ReactElement {
  return (
    <EmptyCard
      icon={MapPin}
      title={strings.waitingTitle}
      body={strings.waitingBody}
      action={strings.openMyMaps}
      onPress={onOpenMyMaps}
    />
  );
}

export interface UnpublishedMapProps {
  /** 노출에 가장 가까운 지도. 만든 지도가 없으면 null */
  map: MyMap | null;
  onOpenMap: (mapId: number) => void;
  onPickPreviews: (mapId: number) => void;
  onCreateMap: () => void;
}

/** 여행자에게 보이는 지도가 없을 때 */
export function UnpublishedMap({
  map,
  onOpenMap,
  onPickPreviews,
  onCreateMap,
}: UnpublishedMapProps): ReactElement {
  return (
    <>
      {map && (
        <DraftCard
          map={map}
          onOpenSpots={() => onOpenMap(map.mapId)}
          onPickPreviews={() => onPickPreviews(map.mapId)}
        />
      )}
      <EmptyCard
        icon={MapTrifold}
        title={strings.unpublishedTitle}
        body={strings.unpublishedBody}
        action={map ? strings.continueMap : strings.createMap}
        onPress={map ? () => onOpenMap(map.mapId) : onCreateMap}
      />
    </>
  );
}

interface DraftCardProps {
  map: MyMap;
  onOpenSpots: () => void;
  onPickPreviews: () => void;
}

/** 남은 조건을 채우러 가는 버튼 */
function DraftCard({
  map,
  onOpenSpots,
  onPickPreviews,
}: DraftCardProps): ReactElement {
  return (
    <Card>
      <View style={styles.body}>
        <Label weight="bold" language="ko">
          {map.title}
        </Label>
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label={strings.spotShortage(map.spotCount, MAP_MIN_SPOTS)}
              language="ko"
              secondary
              onPress={onOpenSpots}
            />
          </View>
          <View style={styles.action}>
            <Button
              label={strings.previewShortage(
                map.previewCount,
                MAP_PREVIEW_SPOTS,
              )}
              language="ko"
              secondary
              disabled={map.spotCount < MAP_MIN_SPOTS}
              onPress={onPickPreviews}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

interface EmptyCardProps {
  icon: Icon;
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}

function EmptyCard({
  icon: CardIcon,
  title,
  body,
  action,
  onPress,
}: EmptyCardProps): ReactElement {
  return (
    <Card>
      <View style={styles.body}>
        <View style={styles.icon}>
          <CardIcon
            size={theme.size.avatar}
            color={theme.color.brand}
            weight="duotone"
          />
        </View>
        <Label center weight="bold" language="ko">
          {title}
        </Label>
        <Label center variant="desc" tone="desc" language="ko">
          {body}
        </Label>
        <Button label={action} language="ko" secondary onPress={onPress} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.space.md },
  icon: { alignItems: "center" },
  actions: { flexDirection: "row", gap: theme.space.sm },
  action: { flex: 1 },
});
