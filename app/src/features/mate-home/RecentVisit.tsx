// M-20 최근 방문: 가장 최근에 인증한 여행자의 마지막 방문.
import { useCallback, useState, type ReactElement } from "react";
import { Image, StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Card, Label } from "../../ui";
import type { MateHomeApi } from "./api";
import { LoadError, Loading } from "./LoadStatus";
import { LocationNotice } from "./LocationNotice";
import { latestVisited, relativeTime } from "./model";
import { strings } from "./strings";
import type { MatchItem } from "./types";
import { useLoad } from "./useLoad";

const PHOTO_SIZE = 56;

export interface RecentVisitProps {
  /** 참조가 고정돼 있어야 한다. */
  api: MateHomeApi;
  matches: readonly MatchItem[];
  onOpenVisits: (matchId: number) => void;
}

export function RecentVisit({
  api,
  matches,
  onOpenVisits,
}: RecentVisitProps): ReactElement {
  const latest = latestVisited(matches);
  return (
    <View style={styles.section}>
      <Label weight="bold" language="ko">
        {strings.recentSection}
      </Label>
      <LocationNotice />
      {latest ? (
        // 여행자가 바뀌면 이전 방문이 남지 않게 새로 만든다.
        <RecentCard
          key={latest.matchId}
          api={api}
          match={latest}
          onPress={() => onOpenVisits(latest.matchId)}
        />
      ) : (
        <NoVisit />
      )}
    </View>
  );
}

interface RecentCardProps {
  api: MateHomeApi;
  match: MatchItem;
  onPress: () => void;
}

function RecentCard({ api, match, onPress }: RecentCardProps): ReactElement {
  const { matchId, partner } = match;
  const load = useCallback(() => api.getVisits(matchId), [api, matchId]);
  const { state, retry } = useLoad(load);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error")
    return <LoadError error={state.error} onRetry={retry} />;
  // 최근 인증 순으로 내려온다.
  const visit = state.data[0];
  if (!visit) return <NoVisit />;
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Thumbnail key={visit.photoUrl} url={visit.photoUrl} />
        <View style={styles.text}>
          <Label weight="semibold" language="ko">
            {strings.recentVisit(partner.nickname, visit.spot.name)}
          </Label>
          <Label variant="caption" tone="desc" language="ko">
            {relativeTime(visit.verifiedAt, Date.now())}
          </Label>
        </View>
      </View>
    </Card>
  );
}

function Thumbnail({ url }: { url: string }): ReactElement {
  const [failed, setFailed] = useState(false);
  if (failed) return <View style={styles.photo} />;
  return (
    <Image
      source={{ uri: url }}
      onError={() => setFailed(true)}
      style={styles.photo}
    />
  );
}

function NoVisit(): ReactElement {
  return (
    <Label variant="caption" tone="desc" language="ko">
      {strings.noVisit}
    </Label>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: theme.space.md },
  text: { flex: 1 },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface2,
  },
});
