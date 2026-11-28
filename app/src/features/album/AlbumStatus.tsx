import type { ReactElement } from "react";
import { ActivityIndicator } from "react-native";
import { theme } from "../../theme";
import { AppBar, Button, Label, Screen } from "../../ui";
import type { ViewerLang } from "../translation";
import { errorText } from "./errors";
import { strings } from "./strings";
import type { AlbumState } from "./useAlbum";

export interface AlbumStatusProps {
  state: Exclude<AlbumState, { status: "ready" }>;
  lang: ViewerLang;
  onBack: () => void;
  onRetry: () => void;
}

/** 앨범을 읽는 중이거나 못 읽었을 때 */
export function AlbumStatus({
  state,
  lang,
  onBack,
  onRetry,
}: AlbumStatusProps): ReactElement {
  const text = strings[lang];
  return (
    <Screen>
      <AppBar
        title={text.title}
        language={lang}
        backLabel={text.back}
        onBack={onBack}
      />
      {state.status === "loading" ? (
        <ActivityIndicator
          accessibilityLabel={text.loading}
          color={theme.color.mainInk}
        />
      ) : (
        <>
          <Label center language={lang}>
            {errorText(state.error, text)}
          </Label>
          <Button
            label={text.retry}
            language={lang}
            secondary
            onPress={onRetry}
          />
        </>
      )}
    </Screen>
  );
}
