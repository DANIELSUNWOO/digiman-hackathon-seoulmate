// M-20 진행 중인 여행자 카드.
import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FlagJpIllustration } from "../../brandAssets";
import { theme } from "../../theme";
import { Card, Label, useFontFamily } from "../../ui";
import { Avatar } from "../avatar";
import { tripLabel } from "./endedTripModel";
import { chatRemaining, sortByLastVisit } from "./model";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";
import { strings } from "./strings";
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
  const { partner, trip } = match;
  return (
    <Card onPress={onPress}>
      <View style={styles.body}>
        <View style={styles.row}>
          <Avatar url={partner.profileImageUrl ?? null} />
          <View style={styles.who}>
            <Label weight="bold" language="ja">
              {partner.nickname}
            </Label>
            {trip && (
              <View style={styles.meta}>
                <FlagJpIllustration size={theme.size.iconInline} />
                <Label variant="caption" tone="desc" language="ko">
                  {tripLabel(trip)}
                </Label>
              </View>
            )}
          </View>
          <StatusPill label={strings.tripPill} />
        </View>
        <Progress match={match} />
      </View>
    </Card>
  );
}

function Progress({ match }: { match: MatchItem }): ReactElement {
  const bold = useFontFamily("bold", "ko");
  const { progress } = match;
  if (!progress)
    return (
      <Label variant="caption" tone="desc" language="ko">
        {strings.courseNotSelected}
      </Label>
    );
  const remaining = chatRemaining(match);
  return (
    <View style={styles.progress}>
      <View style={styles.between}>
        <Label weight="semibold" language="ko">
          {strings.checkIns(progress.visited, progress.total)}
        </Label>
        {remaining === 0 ? (
          <Text style={[styles.chatOk, { fontFamily: bold }]}>
            {strings.chatOk}
          </Text>
        ) : (
          remaining !== null && (
            <Label variant="caption" tone="desc" language="ko">
              {strings.chatLeft(remaining)}
            </Label>
          )
        )}
      </View>
      <ProgressBar value={progress.visited} max={progress.total} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.space.md },
  row: { flexDirection: "row", alignItems: "center", gap: theme.space.md },
  who: { flex: 1 },
  meta: { flexDirection: "row", alignItems: "center", gap: theme.space.xs },
  progress: { gap: theme.space.sm },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatOk: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.color.positive,
  },
});
