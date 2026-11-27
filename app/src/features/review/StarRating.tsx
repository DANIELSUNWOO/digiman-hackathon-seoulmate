import { Star } from "phosphor-react-native";
import type { ReactElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme";

const STARS = [1, 2, 3, 4, 5];

export interface StarRatingProps {
  /** 0이면 아직 고르지 않음 */
  value: number;
  label: (rating: number) => string;
  /** 없으면 보기 전용 */
  onChange?: (rating: number) => void;
  disabled?: boolean;
}

export function StarRating({
  value,
  label,
  onChange,
  disabled = false,
}: StarRatingProps): ReactElement {
  if (!onChange)
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label(value)}
        style={styles.row}
      >
        {STARS.map((star) => (
          <StarIcon
            key={star}
            filled={star <= value}
            size={theme.size.iconSmall}
          />
        ))}
      </View>
    );
  return (
    <View style={styles.row}>
      {STARS.map((star) => (
        <Pressable
          key={star}
          accessibilityRole="button"
          accessibilityLabel={label(star)}
          accessibilityState={{ selected: star === value, disabled }}
          disabled={disabled}
          onPress={() => onChange(star)}
          style={styles.touch}
        >
          <StarIcon
            filled={star <= value}
            size={theme.typography.bigNumber.fontSize}
          />
        </Pressable>
      ))}
    </View>
  );
}

interface StarIconProps {
  filled: boolean;
  size: number;
}

function StarIcon({ filled, size }: StarIconProps): ReactElement {
  return (
    <Star
      size={size}
      weight={filled ? "fill" : "regular"}
      color={filled ? theme.color.brand : theme.color.iconMuted}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: theme.space.xs },
  touch: {
    minWidth: theme.size.touchMin,
    minHeight: theme.size.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
});
