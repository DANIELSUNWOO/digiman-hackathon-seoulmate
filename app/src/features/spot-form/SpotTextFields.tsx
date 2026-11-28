// 스팟 이름·후기·추천 이유 입력.
import type { ReactElement } from "react";
import { Input, Label } from "../../ui";
import { NAME_MAX } from "../spot-location";
import { strings } from "./strings";
import { TEXT_MAX, type SpotFields } from "./useSpotFields";

export interface SpotTextFieldsProps {
  name: string;
  fields: SpotFields;
  editable: boolean;
  onRename: (name: string) => void;
}

export function SpotTextFields({
  name,
  fields,
  editable,
  onRename,
}: SpotTextFieldsProps): ReactElement {
  return (
    <>
      <Field
        label={strings.nameField}
        value={name}
        maxLength={NAME_MAX}
        editable={editable}
        onChangeText={onRename}
      />
      <Field
        label={strings.reviewField}
        placeholder={strings.reviewPlaceholder}
        value={fields.review}
        maxLength={TEXT_MAX}
        editable={editable}
        onChangeText={fields.setReview}
        multiline
      />
      <Field
        label={strings.reasonField}
        placeholder={strings.reasonPlaceholder}
        value={fields.reason}
        maxLength={TEXT_MAX}
        editable={editable}
        onChangeText={fields.setReason}
        multiline
      />
    </>
  );
}

interface FieldProps {
  label: string;
  value: string;
  maxLength: number;
  editable: boolean;
  placeholder?: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
}

function Field({ label, ...props }: FieldProps): ReactElement {
  return (
    <>
      <Label weight="bold" language="ko">
        {label}
      </Label>
      <Input
        {...props}
        language="ko"
        accessibilityLabel={label}
        textAlignVertical={props.multiline ? "top" : "center"}
      />
    </>
  );
}
