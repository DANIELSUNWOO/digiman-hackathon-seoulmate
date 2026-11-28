// 회색 배경 위의 그림자 없는 흰 카드.
import type { ReactElement, ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "../../theme";
import { Card } from "../../ui";

export interface FlatCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FlatCard({ children, style }: FlatCardProps): ReactElement {
  return <Card style={[styles.card, style]}>{children}</Card>;
}

const styles = StyleSheet.create({
  card: {
    gap: theme.space.md,
    borderRadius: theme.radius.sheet,
    shadowOpacity: 0,
    elevation: 0,
  },
});
