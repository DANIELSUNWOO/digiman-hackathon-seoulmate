// M-10a 목록 아래: 공개 중이면 두 버튼, 공개 전이면 남은 조건. 지도 수정·삭제.
import { Eye, MapPin, type Icon } from "phosphor-react-native";
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { Label, TextLink, useFontFamily } from "../../ui";
import type { MateHomeApi } from "./api";
import { DeleteMap } from "./DeleteMap";
import { PublishSteps } from "./PublishSteps";
import { strings } from "./strings";
import type { MapDetail } from "./types";

export interface DetailActionsProps {
  api: MateHomeApi;
  map: MapDetail;
  /** 여행 중인 여행자가 있으면 서버가 수정을 막는다. */
  locked: boolean;
  onAddSpot: () => void;
  onPickPreviews: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function DetailActions(props: DetailActionsProps): ReactElement {
  const { map, locked, onAddSpot, onPickPreviews } = props;
  return (
    <View style={styles.actions}>
      {map.isPublic ? (
        <View style={styles.row}>
          {/* 여행 중인 여행자가 있어도 새 스팟 추가는 된다. */}
          <ActionButton
            icon={MapPin}
            label={strings.addSpot}
            onPress={onAddSpot}
          />
          {!locked && (
            <ActionButton
              icon={Eye}
              label={strings.changePreviews}
              onPress={onPickPreviews}
            />
          )}
        </View>
      ) : (
        <PublishSteps
          spotCount={map.spots.length}
          previewCount={map.spots.filter((spot) => spot.isPreview).length}
          onAddSpot={onAddSpot}
          onPickPreviews={onPickPreviews}
        />
      )}
      <ManageMap {...props} />
    </View>
  );
}

/** 디자인에는 없지만 지도를 고치고 지우는 길을 남긴다. */
function ManageMap({
  api,
  map,
  locked,
  onEdit,
  onDeleted,
}: DetailActionsProps): ReactElement {
  if (locked)
    return (
      <Label center tone="desc" language="ko">
        {strings.locked}
      </Label>
    );
  return (
    <View style={styles.manage}>
      <TextLink
        label={strings.edit}
        language="ko"
        variant="quiet"
        onPress={onEdit}
      />
      <DeleteMap api={api} mapId={map.mapId} onDeleted={onDeleted} />
    </View>
  );
}

interface ActionButtonProps {
  icon: Icon;
  label: string;
  onPress: () => void;
}

function ActionButton({
  icon: ButtonIcon,
  label,
  onPress,
}: ActionButtonProps): ReactElement {
  const fontFamily = useFontFamily("semibold", "ko");
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
    >
      <ButtonIcon
        size={theme.size.iconInline}
        color={theme.color.labelNeutral}
      />
      <Text style={[styles.buttonText, { fontFamily }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { gap: theme.space.md },
  row: { flexDirection: "row", gap: theme.space.sm },
  manage: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.space.xl,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.xs,
    minHeight: theme.size.touchMin,
    borderRadius: theme.radius.input,
    backgroundColor: theme.color.surface,
  },
  buttonText: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    color: theme.color.labelNeutral,
  },
});
