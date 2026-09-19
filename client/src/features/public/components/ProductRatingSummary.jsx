import { useState } from "react";
import { FaStar } from "react-icons/fa";

import {
  distributionRows,
  formatRatingValue,
  StarRating,
} from "./reviewStars";

const ProductRatingSummary = ({
  summary,
  loading = false,
  onOpenReviews,
}) => {
  const [expanded, setExpanded] = useState(false);
  const reviewCount = Number(summary?.reviewCount) || 0;
  const averageRating = Number(summary?.averageRating) || 0;
  const hasReviews = reviewCount > 0;
  const rows = distributionRows(summary?.ratingDistribution);

  const toggleExpanded = () => {
    if (!hasReviews) return;
    setExpanded((open) => !open);
  };

  const handleSeeAllReviews = (event) => {
    event.stopPropagation();
    onOpenReviews?.();
  };

  const onSummaryKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleExpanded();
    }
  };

  if (loading) {
    return (
      <div
        className="product-detail__rating-summary product-detail__rating-summary--loading"
        aria-hidden
      >
        <span className="product-detail__rating-skeleton" />
      </div>
    );
  }

  return (
    <div className="product-detail__rating-block">
      <button
        type="button"
        className="product-detail__rating-summary"
        onClick={toggleExpanded}
        onKeyDown={onSummaryKeyDown}
        aria-expanded={hasReviews ? expanded : false}
        aria-controls="product-rating-breakdown"
      >
        {hasReviews ? (
          <>
            <span className="product-detail__rating-value">
              {formatRatingValue(averageRating)}
            </span>
            <FaStar className="product-detail__rating-star-icon" aria-hidden />
            <span className="product-detail__rating-divider" aria-hidden>
              |
            </span>
            <span className="product-detail__rating-count">
              {reviewCount} Review{reviewCount === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span className="product-detail__rating-empty">
            No ratings yet
          </span>
        )}
      </button>

      {hasReviews && expanded ? (
        <div
          id="product-rating-breakdown"
          className="product-detail__rating-breakdown"
        >
          <div className="product-detail__rating-breakdown-head">
            <div className="product-detail__rating-breakdown-score">
              <span className="product-detail__rating-breakdown-number">
                {formatRatingValue(averageRating)}
              </span>
              <span className="product-detail__rating-breakdown-out-of">
                out of 5
              </span>
              <StarRating rating={averageRating} size="lg" />
              <p className="product-detail__rating-breakdown-meta">
                {reviewCount} rating{reviewCount === 1 ? "" : "s"} and{" "}
                {reviewCount} review{reviewCount === 1 ? "" : "s"}
              </p>
            </div>

            <ul className="product-detail__rating-bars">
              {rows.map((row) => (
                <li key={row.star} className="product-detail__rating-bar-row">
                  <span className="product-detail__rating-bar-label">
                    {row.star} Star
                  </span>
                  <div
                    className="product-detail__rating-bar-track"
                    role="progressbar"
                    aria-valuenow={row.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${row.star} star ratings`}
                  >
                    <span
                      className="product-detail__rating-bar-fill"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                  <span className="product-detail__rating-bar-count">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="product-detail__rating-see-reviews"
            onClick={handleSeeAllReviews}
          >
            See all customer reviews
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ProductRatingSummary;
