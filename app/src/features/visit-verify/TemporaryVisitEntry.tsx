// 임시: 코스 지도(클라 P)가 아직 없어 여행자가 방문 인증에 들어갈 길을 둔다.
// 정식 위치가 정해지면 temporaryEntry.ts와 함께 지운다. 문구도 검수 전이다.
import { useFocusEffect } from "expo-router";
import { useCallback, useState, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { LoadingSkeleton } from "../../loading";
import { theme } from "../../theme";
import { Button, Card, ErrorNotice, Label } from "../../ui";
import { loadEntryCourses, type EntryCourse } from "./temporaryEntry";
import type { CourseSpot } from "./types";
import { VisitProgress } from "./VisitProgress";

export interface TemporaryVisitEntryProps {
  onCheckIn: (matchId: number, spotId: number) => void;
}

type EntryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; courses: EntryCourse[] };

/** 화면에 돌아올 때마다 다시 불러와 인증 결과를 반영한다. */
function useEntryCourses(): { state: EntryState; retry: () => void } {
  const [state, setState] = useState<EntryState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadEntryCourses().then(
        (courses) => {
          if (active) setState({ status: "ready", courses });
        },
        () => {
          if (active) setState({ status: "error" });
        },
      );
      return () => {
        active = false;
      };
    }, [attempt]),
  );

  const retry = (): void => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  };

  return { state, retry };
}

export function TemporaryVisitEntry({
  onCheckIn,
}: TemporaryVisitEntryProps): ReactElement {
  const { state, retry } = useEntryCourses();
  if (state.status === "loading")
    return <LoadingSkeleton label="スポットを読み込み中" />;
  if (state.status === "error")
    return (
      <View style={styles.section}>
        <ErrorNotice language="ja">スポットを読み込めませんでした</ErrorNotice>
        <Button secondary language="ja" label="再試行" onPress={retry} />
      </View>
    );
  if (state.courses.length === 0)
    return <Label language="ja">旅行中の地図はまだありません</Label>;
  return (
    <View style={styles.section}>
      {state.courses.map((course) => (
        <CourseCard
          key={course.matchId}
          course={course}
          onCheckIn={onCheckIn}
        />
      ))}
    </View>
  );
}

interface CourseCardProps extends TemporaryVisitEntryProps {
  course: EntryCourse;
}

function CourseCard({ course, onCheckIn }: CourseCardProps): ReactElement {
  const { matchId, mateNickname, progress, spots } = course;
  return (
    <Card>
      <View style={styles.section}>
        <Label language="ja" weight="bold">
          {mateNickname ? `${mateNickname}さんの地図` : "選択中の地図"}
        </Label>
        <VisitProgress progress={progress} />
        {spots.map((spot) => (
          <SpotRow
            key={spot.spotId}
            spot={spot}
            onPress={() => onCheckIn(matchId, spot.spotId)}
          />
        ))}
      </View>
    </Card>
  );
}

interface SpotRowProps {
  spot: CourseSpot;
  onPress: () => void;
}

function SpotRow({ spot, onPress }: SpotRowProps): ReactElement {
  return (
    <View style={styles.spot}>
      {/* 스팟 이름은 메이트가 쓴 한국어다. */}
      <Label language="ko">{spot.name}</Label>
      <Button
        secondary
        language="ja"
        disabled={spot.visited}
        label={spot.visited ? "訪問済み" : "チェックインする"}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.space.md },
  spot: { gap: theme.space.sm },
});
