import { useState, type ReactElement } from "react";
import { Button, Input, Label } from "../../ui";
import { StarRating } from "./StarRating";
import type { ReviewStrings } from "./strings";
import type { ReviewRequest } from "./types";

// 서버 AlbumReviewService.ReviewRequest의 제한
const CONTENT_MAX = 300;

export interface ReviewFormProps {
  text: ReviewStrings;
  sending: boolean;
  /** 서버가 더는 받지 않는 상태 */
  closed: boolean;
  onSubmit: (request: ReviewRequest) => void;
}

export function ReviewForm({
  text,
  sending,
  closed,
  onSubmit,
}: ReviewFormProps): ReactElement {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const language = text.lang;

  const send = (): void => {
    const trimmed = content.trim();
    onSubmit(trimmed ? { rating, content: trimmed } : { rating });
  };

  return (
    <>
      <Label language={language} variant="body2">
        {text.question}
      </Label>
      <Label language={language} variant="label">
        {text.ratingLabel}
      </Label>
      <StarRating
        value={rating}
        label={text.star}
        onChange={setRating}
        disabled={sending}
      />
      <CommentField
        text={text}
        value={content}
        editable={!sending}
        onChange={setContent}
      />
      <Label language={language} variant="caption" tone="desc">
        {rating === 0 ? text.ratingHint : text.noEdit}
      </Label>
      <Button
        label={text.submit}
        language={language}
        disabled={rating === 0 || closed}
        loading={sending}
        onPress={send}
      />
    </>
  );
}

interface CommentFieldProps {
  text: ReviewStrings;
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}

function CommentField({
  text,
  value,
  editable,
  onChange,
}: CommentFieldProps): ReactElement {
  return (
    <>
      <Label language={text.lang} variant="label">
        {text.commentLabel}
      </Label>
      <Input
        language={text.lang}
        value={value}
        onChangeText={onChange}
        editable={editable}
        multiline
        textAlignVertical="top"
        maxLength={CONTENT_MAX}
        placeholder={text.commentPlaceholder}
        accessibilityLabel={text.commentLabel}
        style={{ minHeight: 96 }}
      />
      <Label language={text.lang} variant="caption" tone="desc">
        {`${value.length} / ${CONTENT_MAX}`}
      </Label>
    </>
  );
}
