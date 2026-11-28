import { Camera } from "phosphor-react-native";
import type { ReactElement } from "react";
import { Image, Linking, Platform, StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { Button, ErrorNotice, Label } from "../../ui";
import { strings } from "./strings";
import type { PhotoPicking } from "./usePhoto";

export interface PhotoFieldProps {
  picking: PhotoPicking;
  disabled?: boolean;
}

export function PhotoField({
  picking,
  disabled = false,
}: PhotoFieldProps): ReactElement {
  const { photo, preparing, choose } = picking;
  const locked = disabled || preparing;
  return (
    <>
      {photo ? (
        <Image
          source={{ uri: photo.uri }}
          accessibilityLabel={strings.photoSelected}
          style={styles.preview}
        />
      ) : (
        <View style={[styles.preview, styles.empty]}>
          <Camera size={theme.size.icon} color={theme.color.iconMuted} />
          <Label language="ja" tone="desc">
            {preparing ? strings.photoPreparing : strings.addPhoto}
          </Label>
        </View>
      )}
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            label={strings.takePhoto}
            language="ja"
            secondary
            disabled={locked}
            onPress={() => void choose("camera")}
          />
        </View>
        <View style={styles.action}>
          <Button
            label={strings.choosePhoto}
            language="ja"
            secondary
            disabled={locked}
            onPress={() => void choose("library")}
          />
        </View>
      </View>
      <PhotoProblem problem={picking.problem} />
    </>
  );
}

function PhotoProblem({
  problem,
}: Pick<PhotoPicking, "problem">): ReactElement | null {
  if (problem === null) return null;
  return (
    <>
      <ErrorNotice language="ja">
        {problem === "denied" ? strings.cameraDenied : strings.photoFailed}
      </ErrorNotice>
      {/* 웹에는 앱 설정 화면이 없다. */}
      {problem === "denied" && Platform.OS !== "web" && (
        <Button
          label={strings.openSettings}
          language="ja"
          secondary
          onPress={() => void Linking.openSettings()}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.surface2,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.sm,
  },
  actions: { flexDirection: "row", gap: theme.space.sm },
  action: { flex: 1 },
});
