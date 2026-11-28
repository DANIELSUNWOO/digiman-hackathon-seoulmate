// M-10 공개 전 지도의 남은 조건 두 줄.
import { CaretRight, Check } from "phosphor-react-native";
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { Label, useFontFamily } from "../../ui";
import { MAP_MIN_SPOTS, MAP_PREVIEW_SPOTS } from "./model";
import { strings } from "./strings";

export interface PublishStepsProps {
  spotCount: number;
  previewCount: number;
  onAddSpot: () => void;
  onPickPreviews: () => void;
}

export function PublishSteps({
  spotCount,
  previewCount,
  onAddSpot,
  onPickPreviews,
}: PublishStepsProps): ReactElement {
  return (
    <View style={styles.list}>
      <Label variant="caption" tone="desc" language="ko">
        {strings.publishGuide}
      </Label>
      <Step
        label={strings.stepSpots(MAP_MIN_SPOTS)}
        count={spotCount}
        required={MAP_MIN_SPOTS}
        onPress={onAddSpot}
      />
      <Step
        label={strings.stepPreviews(MAP_PREVIEW_SPOTS)}
        count={previewCount}
        required={MAP_PREVIEW_SPOTS}
        // 스팟을 다 채워야 공개할 곳을 고른다.
        disabled={spotCount < MAP_MIN_SPOTS}
        onPress={onPickPreviews}
      />
    </View>
  );
}

interface StepProps {
  label: string;
  count: number;
  required: number;
  disabled?: boolean;
  onPress: () => void;
}

function Step({
  label,
  count,
  required,
  disabled = false,
  onPress,
}: StepProps): ReactElement {
  const done = count >= required;
  const medium = useFontFamily("medium", "ko");
  const bold = useFontFamily("bold", "ko");
  const tone = done || disabled ? styles.muted : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, checked: done }}
      disabled={disabled}
      onPress={onPress}
      style={styles.step}
    >
      <View style={[styles.check, done && styles.checkDone]}>
        {done && <Check size={12} color={theme.color.surface} weight="bold" />}
      </View>
      <Text style={[styles.label, { fontFamily: medium }, tone]}>{label}</Text>
      <Text style={[styles.count, { fontFamily: medium }]}>
        <Text style={[styles.value, { fontFamily: bold }, tone]}>
          {Math.min(count, required)}
        </Text>
        {` / ${required}`}
      </Text>
      <CaretRight
        size={theme.size.iconInline}
        color={theme.color.labelAssist}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.space.sm },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
    minHeight: theme.size.touchMin,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.input,
    backgroundColor: theme.color.surface2,
  },
  check: {
    width: theme.size.iconSmall,
    height: theme.size.iconSmall,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.color.checkOff,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
  },
  checkDone: {
    borderColor: theme.color.brandDeep,
    backgroundColor: theme.color.brandDeep,
  },
  label: {
    flex: 1,
    fontSize: theme.typography.desc.fontSize,
    lineHeight: theme.typography.desc.lineHeight,
    color: theme.color.labelNormal,
  },
  count: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.color.labelDesc,
  },
  value: {
    fontSize: theme.typography.body2.fontSize,
    color: theme.color.brandDeep,
  },
  muted: { color: theme.color.labelDesc },
});
