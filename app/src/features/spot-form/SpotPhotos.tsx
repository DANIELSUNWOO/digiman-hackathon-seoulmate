import { X } from "phosphor-react-native";
import type { ReactElement } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { theme } from "../../theme";
import { Button, ErrorNotice, Label } from "../../ui";
import { usePhotoPicker, type PickPhoto } from "../photo-upload";
import { strings } from "./strings";
import { PHOTO_MAX, type SpotFields } from "./useSpotFields";

export interface SpotPhotosProps {
  fields: SpotFields;
  pickPhoto: PickPhoto;
  disabled: boolean;
}

export function SpotPhotos({
  fields,
  pickPhoto,
  disabled,
}: SpotPhotosProps): ReactElement {
  const { photos, addPhoto, removePhoto } = fields;
  const { preparing, problem, choose } = usePhotoPicker(pickPhoto, addPhoto);
  const locked = disabled || preparing || photos.length >= PHOTO_MAX;
  return (
    <>
      <Label weight="bold" language="ko">
        {strings.photos(photos.length, PHOTO_MAX)}
      </Label>
      <View style={styles.row}>
        {photos.map((photo, index) => (
          <Thumbnail
            key={photo.uri}
            uri={photo.uri}
            order={index + 1}
            disabled={disabled}
            onRemove={() => removePhoto(photo.uri)}
          />
        ))}
      </View>
      {preparing && <Label language="ko">{strings.preparing}</Label>}
      <Button
        label={strings.takePhoto}
        language="ko"
        secondary
        disabled={locked}
        onPress={() => void choose("camera")}
      />
      <Button
        label={strings.choosePhoto}
        language="ko"
        secondary
        disabled={locked}
        onPress={() => void choose("library")}
      />
      {problem && <PhotoProblem problem={problem} />}
    </>
  );
}

interface ThumbnailProps {
  uri: string;
  order: number;
  disabled: boolean;
  onRemove: () => void;
}

function Thumbnail({
  uri,
  order,
  disabled,
  onRemove,
}: ThumbnailProps): ReactElement {
  return (
    <View style={styles.item}>
      <Image
        source={{ uri }}
        accessibilityLabel={strings.photoLabel(order)}
        style={styles.image}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.removePhoto(order)}
        disabled={disabled}
        onPress={onRemove}
        style={styles.remove}
      >
        <View style={styles.removeMark}>
          <X size={theme.size.iconInline} color={theme.color.surface} />
        </View>
      </Pressable>
    </View>
  );
}

function PhotoProblem({
  problem,
}: {
  problem: "denied" | "failed";
}): ReactElement {
  return (
    <>
      <ErrorNotice language="ko">
        {problem === "denied" ? strings.cameraDenied : strings.photoFailed}
      </ErrorNotice>
      {/* 웹에는 앱 설정 화면이 없다. */}
      {problem === "denied" && Platform.OS !== "web" && (
        <Button
          label={strings.openSettings}
          language="ko"
          secondary
          onPress={() => void Linking.openSettings()}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: theme.space.sm },
  // 세 칸을 나눠 쓴다. 한 장일 때도 같은 크기다.
  item: { width: "31%", aspectRatio: 1 },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface2,
  },
  remove: {
    position: "absolute",
    top: 0,
    right: 0,
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    alignItems: "flex-end",
    padding: theme.space.xs,
  },
  removeMark: {
    padding: theme.space.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.dim,
  },
});
