import type { ReactElement } from "react";
import { ErrorNotice, Notice } from "../../ui";
import type { ReviewApi } from "./api";
import { errorText, isReviewClosed } from "./errors";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";
import type { ReviewStrings } from "./strings";
import type { Review, ReviewRequest } from "./types";
import type { ReviewsLoad } from "./useReviews";
import { useSubmitReview } from "./useSubmitReview";

export interface ReviewContentProps {
  api: ReviewApi;
  matchId: number;
  userId: string;
  text: ReviewStrings;
  reviews: Review[];
  load: Pick<ReviewsLoad, "add" | "refresh">;
}

function sentReview(
  { rating, content }: ReviewRequest,
  reviewId: number,
  userId: string,
  text: ReviewStrings,
): Review {
  return {
    reviewId,
    reviewer: { userId, nickname: "" },
    rating,
    content: content
      ? { original: content, translated: null, sourceLang: text.lang }
      : null,
    createdAt: new Date().toISOString(),
  };
}

export function ReviewContent({
  api,
  matchId,
  userId,
  text,
  reviews,
  load,
}: ReviewContentProps): ReactElement {
  const { sending, sent, error, submit } = useSubmitReview(api, matchId, {
    onSent: (request, reviewId) =>
      load.add(sentReview(request, reviewId, userId, text)),
    onAlreadyReviewed: load.refresh,
  });
  const mine = reviews.find((review) => review.reviewer?.userId === userId);
  const partner = reviews.find((review) => review !== mine);

  return (
    <>
      {sent && <Notice language={text.lang}>{text.sent}</Notice>}
      {error !== null && (
        <ErrorNotice language={text.lang}>
          {errorText(error, text, text.errorSubmit)}
        </ErrorNotice>
      )}
      {mine ? (
        <ReviewCard title={text.mineTitle} review={mine} text={text} />
      ) : (
        <ReviewForm
          text={text}
          sending={sending}
          closed={isReviewClosed(error)}
          onSubmit={submit}
        />
      )}
      {partner && (
        <ReviewCard title={text.partnerTitle} review={partner} text={text} />
      )}
    </>
  );
}
