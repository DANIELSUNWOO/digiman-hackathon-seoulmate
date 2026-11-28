import type { ReactElement } from "react";
import { Input, Label } from "../../ui";
import { strings } from "./strings";

// 서버 VisitService.VisitRequest의 제한
const REVIEW_MAX = 500;

export interface ReviewFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function ReviewField({
  value,
  onChange,
}: ReviewFieldProps): ReactElement {
  return (
    <>
      <Label language="ja" variant="label">
        {strings.reviewLabel}
      </Label>
      <Input
        language="ja"
        value={value}
        onChangeText={onChange}
        multiline
        textAlignVertical="top"
        maxLength={REVIEW_MAX}
        placeholder={strings.reviewPlaceholder}
        accessibilityLabel={strings.reviewLabel}
        style={{ minHeight: 96 }}
      />
      <Label language="ja" variant="caption" tone="desc">
        {`${value.length} / ${REVIEW_MAX}`}
      </Label>
    </>
  );
}
