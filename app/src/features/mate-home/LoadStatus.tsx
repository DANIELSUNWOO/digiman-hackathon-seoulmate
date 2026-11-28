import { LoadingSkeleton, type LoadingShape } from "../../loading";
import { Button, Label } from "../../ui";
import { errorMessage } from "./errors";
import { strings } from "./strings";

export function Loading({ shape = "cards" }: { shape?: LoadingShape }) {
  return <LoadingSkeleton label={strings.loading} shape={shape} />;
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
