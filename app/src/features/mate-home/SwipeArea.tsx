// 좌우로 밀어 탭을 바꾼다. 세로 스크롤과 버튼 누르기는 그대로 둔다.
import { useMemo, type ReactElement, type ReactNode } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { theme } from "../../theme";

// 이만큼 가로로 움직여야 밀기로 본다.
const START_DISTANCE = 16;
const SWIPE_DISTANCE = 48;

export type SwipeDirection = "left" | "right";

export interface SwipeAreaProps {
  /** 참조가 고정돼 있어야 한다. */
  onSwipe: (direction: SwipeDirection) => void;
  children: ReactNode;
}

export function SwipeArea({ onSwipe, children }: SwipeAreaProps): ReactElement {
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, { dx, dy }) =>
          Math.abs(dx) > START_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5,
        onPanResponderRelease: (_, { dx }) => {
          if (Math.abs(dx) < SWIPE_DISTANCE) return;
          onSwipe(dx < 0 ? "left" : "right");
        },
      }),
    [onSwipe],
  );
  return (
    <View style={styles.area} {...responder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // 빈 곳에서도 밀 수 있게 남은 높이를 채운다.
  area: { flexGrow: 1, gap: theme.space.lg },
});
