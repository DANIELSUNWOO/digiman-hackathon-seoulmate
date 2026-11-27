import { ActivityIndicator } from "react-native";
import { theme } from "../../theme";
import { Button, Label } from "../../ui";
import { errorMessage } from "./errors";
import { strings } from "./strings";

export function Loading() {
  return (
    <ActivityIndicator
      accessibilityLabel={strings.loading}
      color={theme.color.mainInk}
    />
  );
}

export function LoadError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <>
      <Label center language="ko">
        {errorMessage(error)}
      </Label>
      <Button label={strings.retry} language="ko" secondary onPress={onRetry} />
    </>
  );
}
