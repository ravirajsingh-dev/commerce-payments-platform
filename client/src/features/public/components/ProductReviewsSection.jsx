import { FaCheck } from "react-icons/fa";

import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import ProductReviewForm from "./ProductReviewForm";
import { StarRating } from "./reviewStars";

const REVIEW_STATUS_LABELS = {
  pending: "Pending approval",
  approved: "Published",
  rejected: "Not published",
};

const formatReviewDate = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const ReviewCard = ({ review, isOwn = false }) => {
  const showStatus =
    isOwn && review.status && review.status !== "approved";

  return (
    <li
      className={`product-reviews__item${
        isOwn ? " product-reviews__item--own" : ""
      }`}
    >
      {isOwn ? (
        <p className="product-reviews__your-label">Your review</p>
      ) : null}

      <div className="product-reviews__item-top">
        <div className="product-reviews__item-rating-row">
          <StarRating rating={review.rating} size="sm" />
          {review.title ? (
            <h3 className="product-reviews__review-title">{review.title}</h3>
          ) : null}
        </div>
      </div>

      <p className="product-reviews__reviewer-name">{review.reviewerName}</p>

      {review.purchaseFor ? (
        <p className="product-reviews__purchase-for">
          Review for: {review.purchaseFor}
        </p>
      ) : null}

      {review.comment ? (
        <p className="product-reviews__review-comment">{review.comment}</p>
      ) : null}

      {showStatus ? (
        <p className="product-reviews__review-status">
          {REVIEW_STATUS_LABELS[review.status] || review.status}
        </p>
      ) : null}

      <p className="product-reviews__verified">
        <FaCheck className="product-reviews__verified-icon" aria-hidden />
        Verified purchase
        {review.createdAt ? (
          <span className="product-reviews__verified-date">
            {formatReviewDate(review.createdAt)}
          </span>
        ) : null}
      </p>
    </li>
  );
};

const ProductReviewsSection = ({
  variantId,
  isAuthenticated,
  sectionRef,
  loading,
  loadingMore,
  reviews,
  summary,
  canReview,
  userReview,
  onReviewSubmitted,
  loadMore,
  hasMore,
}) => {
  if (!variantId) return null;

  const reviewCount = Number(summary?.reviewCount) || 0;
  const userReviewId = userReview?._id ? String(userReview._id) : "";
  const otherReviews = reviews.filter(
    (review) => String(review._id) !== userReviewId,
  );
  const hasListItems = Boolean(userReview) || otherReviews.length > 0;

  return (
    <section
      ref={sectionRef}
      className="product-reviews"
      aria-labelledby="product-reviews-heading"
      id="customer-reviews"
    >
      <div className="product-reviews__inner">
        <h2 id="product-reviews-heading" className="product-reviews__heading">
          Customer reviews
        </h2>

        {reviewCount > 0 ? (
          <div className="product-reviews__overview">
            <div className="product-reviews__overview-left">
              <StarRating rating={summary.averageRating || 0} size="lg" />
              <p className="product-reviews__overview-counts">
                <strong>{summary.averageRating}</strong> out of 5 ·{" "}
                {reviewCount} review{reviewCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <BouncingLoader minHeight="160px" />
        ) : (
          <>
            {isAuthenticated && canReview && !userReview ? (
              <ProductReviewForm
                variantId={variantId}
                onSubmitted={onReviewSubmitted}
              />
            ) : null}

            {!isAuthenticated ? (
              <p className="product-reviews__sign-in-hint">
                Sign in and purchase this item to leave a review after delivery.
              </p>
            ) : null}

            {isAuthenticated && !canReview && !userReview ? (
              <p className="product-reviews__sign-in-hint">
                Reviews are available after your order is delivered for this product.
              </p>
            ) : null}

            {hasListItems ? (
              <ul className="product-reviews__list">
                {userReview ? (
                  <ReviewCard review={userReview} isOwn />
                ) : null}
                {otherReviews.map((review) => (
                  <ReviewCard key={review._id} review={review} />
                ))}
              </ul>
            ) : !loading ? (
              <p className="product-reviews__empty">
                Be the first to share your experience.
              </p>
            ) : null}

            {hasMore ? (
              <div className="product-reviews__load-more-wrap">
                <button
                  type="button"
                  className="btn btn--outline product-reviews__load-more"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
};

export default ProductReviewsSection;
