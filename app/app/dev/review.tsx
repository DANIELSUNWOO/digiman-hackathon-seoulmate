import { Redirect, useRouter } from "expo-router";
import { useMemo, useState, type ReactElement } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReviewScreen, type ReviewerRole } from "../../src/features/review";
import {
  createMockReviewApi,
  type MockReviews,
  type MockSubmit,
} from "../../src/features/review/mockApi";
import { theme } from "../../src/theme";
import { Button, Chip, Input } from "../../src/ui";

const ROLES: ReviewerRole[] = ["TRAVELER", "MATE"];
const REVIEWS: MockReviews[] = ["none", "partner", "both", "error"];
const SUBMITS: MockSubmit[] = [
  "ok",
  "network",
  "already",
  "notCompleted",
  "blocked",
];
const USER_ID = "me";

// 상호 후기 확인용 경로. 끝난 매칭 없이 들어온다. 개발 빌드에서만 열린다.
export default function DevReview(): ReactElement {
  const [role, setRole] = useState<ReviewerRole>("TRAVELER");
  const [reviews, setReviews] = useState<MockReviews>("none");
  const [submit, setSubmit] = useState<MockSubmit>("ok");
  const api = useMemo(
    () => createMockReviewApi({ userId: USER_ID, role, reviews, submit }),
    [role, reviews, submit],
  );
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surface }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.space.sm,
          paddingHorizontal: theme.space.screen,
        }}
      >
        <Choices values={ROLES} value={role} onChange={setRole} />
        <Choices values={REVIEWS} value={reviews} onChange={setReviews} />
        <Choices
          prefix="제출 "
          values={SUBMITS}
          value={submit}
          onChange={setSubmit}
        />
        <RealRouteEntry />
      </View>
      {/* 시나리오가 바뀌면 화면을 새로 만든다. */}
      <View key={`${role}-${reviews}-${submit}`} style={{ flex: 1 }}>
        <ReviewScreen
          api={api}
          matchId={101}
          userId={USER_ID}
          role={role}
          onBack={() => {}}
        />
      </View>
    </SafeAreaView>
  );
}

interface ChoicesProps<T extends string> {
  prefix?: string;
  values: T[];
  value: T;
  onChange: (value: T) => void;
}

function Choices<T extends string>({
  prefix = "",
  values,
  value,
  onChange,
}: ChoicesProps<T>): ReactElement {
  return (
    <>
      {values.map((option) => (
        <Chip
          key={option}
          label={`${prefix}${option}`}
          selected={value === option}
          onPress={() => onChange(option)}
        />
      ))}
    </>
  );
}

/** 로그인한 상태에서 실서버의 매칭 번호로 들어간다. */
function RealRouteEntry(): ReactElement {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  return (
    <>
      <Input
        value={matchId}
        onChangeText={setMatchId}
        placeholder="matchId"
        accessibilityLabel="matchId"
        inputMode="numeric"
      />
      <Button
        label="실제 경로 열기"
        language="ko"
        secondary
        disabled={!matchId}
        onPress={() => router.push(`/matches/${matchId}/review`)}
      />
    </>
  );
}
