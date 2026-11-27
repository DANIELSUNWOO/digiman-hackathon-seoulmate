import type { ReactElement } from "react";
import { theme } from "../../theme";
import { Card, Label } from "../../ui";
import { TranslatedText } from "../translation";
import { StarRating } from "./StarRating";
import type { ReviewStrings } from "./strings";
import type { Review } from "./types";

export interface ReviewCardProps {
  title: string;
  review: Review;
  text: ReviewStrings;
}

export function ReviewCard({
  title,
  review,
  text,
}: ReviewCardProps): ReactElement {
  return (
    <Card style={{ gap: theme.space.sm }}>
      <Label language={text.lang} variant="label">
        {title}
      </Label>
      <StarRating value={review.rating} label={text.star} />
      {review.content ? (
        <TranslatedText value={review.content} viewerLang={text.lang} />
      ) : (
        <Label language={text.lang} variant="caption" tone="desc">
          {text.noContent}
        </Label>
      )}
    </Card>
  );
}
