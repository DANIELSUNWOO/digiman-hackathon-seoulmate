import { MapPinArea } from "phosphor-react-native";
import { useState, type ReactElement } from "react";
import { theme } from "../../theme";
import { Button, Label, Notice, ScreenFooter } from "../../ui";
import { PhotoField } from "./PhotoField";
import { ReviewField } from "./ReviewField";
import { strings } from "./strings";
import type { PickPhoto, ReadPosition, SubmitVisit } from "./types";
import { usePhoto } from "./usePhoto";
import { useVerification } from "./useVerification";
import { VerifyDone } from "./VerifyDone";
import { VerifySheet } from "./VerifySheet";

export interface VerifyFormProps {
  pickPhoto: PickPhoto;
  readPosition: ReadPosition;
  submit: SubmitVisit;
  onDone: () => void;
}

/** 사진과 후기가 모두 있어야 제출할 수 있다. */
export function VerifyForm({
  pickPhoto,
  readPosition,
  submit,
  onDone,
}: VerifyFormProps): ReactElement {
  const picking = usePhoto(pickPhoto);
  const flow = useVerification(readPosition, submit);
  const [review, setReview] = useState("");
  const { photo, preparing } = picking;
  const content = review.trim();
  const start = (): void => {
    if (photo) void flow.start({ photo, review: content });
  };

  if (flow.state.status === "done") return <VerifyDone onBack={onDone} />;

  return (
    <>
      <Label language="ja" variant="desc" tone="desc">
        {strings.subtitle}
      </Label>
      <PhotoField picking={picking} />
      <ReviewField value={review} onChange={setReview} />
      <Notice
        language="ja"
        icon={
          <MapPinArea
            size={theme.size.iconSmall}
            color={theme.color.brandDeep}
          />
        }
      >
        {strings.locationNotice}
      </Notice>
      <ScreenFooter>
        <Button
          label={strings.submit}
          language="ja"
          disabled={photo === null || preparing || content === ""}
          onPress={start}
        />
      </ScreenFooter>
      <VerifySheet state={flow.state} onRetry={start} onClose={flow.close} />
    </>
  );
}
