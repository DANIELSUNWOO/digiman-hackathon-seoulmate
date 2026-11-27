// M-10 내 지도 목록: 노출 상태와 부족한 조건을 보여 준다. 만들기·상세는 Q-05.
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { Button, Card, Label, Screen } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { LoadError, Loading } from "./LoadStatus";
import { previewLabel, spotLabel } from "./model";
import { strings } from "./strings";
import type { MyMap } from "./types";
import { useLoad } from "./useLoad";

export function MyMapsScreen({ api = mateHomeApi }: { api?: MateHomeApi }) {
  const load = useCallback(() => api.getMyMaps(), [api]);
  const { state, retry } = useLoad(load);

  return (
    <Screen>
      <Label title language="ko">
        {strings.mapsTitle}
      </Label>
      {state.status === "loading" && <Loading />}
      {state.status === "error" && (
        <LoadError error={state.error} onRetry={retry} />
      )}
      {state.status === "ready" && state.data.length === 0 && <EmptyMaps />}
      {state.status === "ready" &&
        state.data.map((map) => <MapCard key={map.mapId} map={map} />)}
    </Screen>
  );
}

function EmptyMaps() {
  return (
    <>
      <Label center language="ko">
        {strings.mapsEmpty}
      </Label>
      {/* 지도 만들기 화면(Q-05)이 생기면 활성화한다. */}
      <Button label={strings.createMap} language="ko" disabled />
      <Label center language="ko">
        {strings.createMapPending}
      </Label>
    </>
  );
}

function MapCard({ map }: { map: MyMap }) {
  return (
    <Card>
      <View style={[styles.badge, map.isPublic && styles.badgePublic]}>
        <Text
          style={[styles.badgeText, map.isPublic && styles.badgeTextPublic]}
        >
          {map.isPublic ? strings.exposed : strings.hidden}
        </Text>
      </View>
      <Label weight="bold" language="ko">
        {map.title}
      </Label>
      {map.caption && <Label language="ko">{map.caption.original}</Label>}
      <Label language="ko">{`${spotLabel(map)} · ${previewLabel(map)}`}</Label>
      {map.selectedCount !== undefined && (
        <Label language="ko">{strings.selectedCount(map.selectedCount)}</Label>
      )}
      {!!map.travelingCount && (
        <Label language="ko">
          {strings.travelingCount(map.travelingCount)}
        </Label>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    marginBottom: theme.space.sm,
    backgroundColor: theme.color.background,
  },
  badgePublic: { backgroundColor: theme.color.tealSoft },
  badgeText: {
    // 커스텀 Bold 폰트에 fontWeight가 겹치지 않게 크기와 줄 높이만 쓴다.
    fontSize: theme.typography.caption1Bold.fontSize,
    lineHeight: theme.typography.caption1Bold.lineHeight,
    fontFamily: "NotoSansKR_700Bold",
    color: theme.color.muted,
  },
  badgeTextPublic: { color: theme.color.tealInk },
});
