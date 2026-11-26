import { ActivityIndicator } from "react-native";
import { ApiError } from "../../api";
import { theme } from "../../theme";
import { Button, Label } from "../../ui";
import { strings } from "./strings";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK") return strings.errorNetwork;
    if (error.code === "SESSION_EXPIRED") return strings.errorSession;
  }
  return strings.errorDefault;
}

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
