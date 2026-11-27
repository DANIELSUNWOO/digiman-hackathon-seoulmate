import { MapPinArea } from "phosphor-react-native";
import { useState, type ReactElement } from "react";
import { theme } from "../../theme";
import { Button, Input, Label, Notice, ScreenFooter } from "../../ui";
import { PhotoField } from "./PhotoField";
import { strings } from "./strings";
import type { PickPhoto, VisitDraft } from "./types";
import { usePhoto } from "./usePhoto";

// 서버 VisitService.VisitRequest의 제한
const REVIEW_MAX = 500;

export interface VerifyFormProps {
  pickPhoto: PickPhoto;
  onSubmit: (draft: VisitDraft) => void;
}

/** 사진과 후기가 모두 있어야 제출할 수 있다. */
export function VerifyForm({
  pickPhoto,
  onSubmit,
}: VerifyFormProps): ReactElement {
  const picking = usePhoto(pickPhoto);
  const [review, setReview] = useState("");
  const { photo, preparing } = picking;
  const content = review.trim();

  return (
    <>
      <PhotoField picking={picking} />
      <Label language="ja" variant="label">
        {strings.reviewLabel}
      </Label>
      <Input
        language="ja"
        value={review}
        onChangeText={setReview}
        multiline
        textAlignVertical="top"
        maxLength={REVIEW_MAX}
        placeholder={strings.reviewPlaceholder}
        accessibilityLabel={strings.reviewLabel}
        style={{ minHeight: 96 }}
      />
      <Label language="ja" variant="caption" tone="desc">
        {`${review.length} / ${REVIEW_MAX}`}
      </Label>
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
          onPress={() => {
            if (photo) onSubmit({ photo, review: content });
          }}
        />
      </ScreenFooter>
    </>
  );
}
