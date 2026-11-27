import type { ReactElement, ReactNode } from "react";
import { ActivityIndicator } from "react-native";
import { theme } from "../../theme";
import { Button, Label, Screen } from "../../ui";
import type { ViewerLang } from "../translation";
import { errorText } from "./errors";
import { strings } from "./strings";
import type { AlbumState } from "./useAlbum";

export interface AlbumStatusProps {
  state: Exclude<AlbumState, { status: "ready" }>;
  lang: ViewerLang;
  top: ReactNode;
  onRetry: () => void;
}

/** 앨범을 읽는 중이거나 못 읽었을 때 */
export function AlbumStatus({
  state,
  lang,
  top,
  onRetry,
}: AlbumStatusProps): ReactElement {
  const text = strings[lang];
  return (
    <Screen>
      {top}
      <Label title language={lang}>
        {text.title}
      </Label>
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
