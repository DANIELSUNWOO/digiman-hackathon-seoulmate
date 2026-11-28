// M-20 메이트 홈: 매칭 현황과 여행자 목록.
import { useCallback, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Label, Screen } from "../../ui";
import { mateHomeApi, type MateHomeApi } from "./api";
import { EmptyMatches } from "./EmptyMatches";
import { EndedTrips } from "./EndedTrips";
import { LoadError, Loading } from "./LoadStatus";
import { LocationNotice } from "./LocationNotice";
import { MatchList } from "./MatchList";
import { strings } from "./strings";
import type { MateProfile } from "./types";
import { useLoad } from "./useLoad";

export interface MateHomeScreenProps {
  api?: MateHomeApi;
  /** 제목 오른쪽에 둘 것 (알림 종) */
  headerRight?: ReactNode;
  onOpenVisits: (matchId: number) => void;
  onOpenAlbum: (matchId: number) => void;
  onOpenMap: (mapId: number) => void;
  onCreateMap: () => void;
}

export function MateHomeScreen({
  api = mateHomeApi,
  headerRight,
  onOpenVisits,
  onOpenAlbum,
  onOpenMap,
  onCreateMap,
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
      <LocationNotice />
      {state.status === "loading" && <Loading />}
      {state.status === "error" && (
        <LoadError error={state.error} onRetry={retry} />
      )}
      {state.status === "ready" && (
        <>
          <SectionTitle profile={state.data[0]} />
          {state.data[1].length === 0 ? (
            <EmptyMatches
              api={api}
              onOpenMap={onOpenMap}
              onCreateMap={onCreateMap}
            />
          ) : (
            <MatchList matches={state.data[1]} onOpenVisits={onOpenVisits} />
          )}
          <EndedTrips api={api} onOpenAlbum={onOpenAlbum} />
        </>
      )}
    </Screen>
  );
}

function SectionTitle({ profile }: { profile: MateProfile }) {
  const capacity = profile.matchCapacity;
  return (
    <Label weight="bold" language="ko">
      {capacity
        ? `${strings.matchSection} ${capacity.active} / ${capacity.max}`
        : strings.matchSection}
    </Label>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
