import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import {
  REVIEW_STATUS_LABELS,
  formatReviewDate,
  formatReviewRating,
  reviewStatusClass,
} from "../reviewHelpers";
import ReviewRatingStars from "./ReviewRatingStars";

const ReviewDetailModal = ({ show, review, onHide }) => {
  if (!review) return null;

  const rows = [
    { label: "Product", value: review.productName || "—" },
    { label: "SKU", value: review.variantSku || "—" },
    { label: "Customer", value: review.userName || "—" },
    { label: "Email", value: review.userEmail || "—" },
    { label: "Rating", value: formatReviewRating(review.rating) },
    { label: "Status", value: REVIEW_STATUS_LABELS[review.status] || review.status },
    { label: "Submitted", value: formatReviewDate(review.createdAt) },
    { label: "Updated", value: formatReviewDate(review.updatedAt) },
  ];

  return (
    <AdvancedModal
      show={show}
      onHide={onHide}
      title="Review details"
      size="lg"
      closeButton
      actions={[
        {
          label: "Close",
          onClick: onHide,
          className: "btn btn--theme",
          colSize: 12,
        },
      ]}
    >
      <div className="review-detail">
        <div className="d-flex align-items-center gap-2 mb-3">
          <ReviewRatingStars rating={review.rating} />
          <span
            className={`badge entity-status entity-status--${reviewStatusClass(review.status)}`}
          >
            {REVIEW_STATUS_LABELS[review.status] || review.status}
          </span>
        </div>

        {rows.map((row) => (
          <div key={row.label} className="review-detail__row">
            <span className="review-detail__label">{row.label}</span>
            <span className="review-detail__value">{row.value}</span>
          </div>
        ))}

        {review.title ? (
          <div className="review-detail__row">
            <span className="review-detail__label">Title</span>
            <span className="review-detail__value">{review.title}</span>
          </div>
        ) : null}

        {review.comment ? (
          <div>
            <span className="review-detail__label d-block mb-2">Comment</span>
            <div className="review-detail__comment-block">{review.comment}</div>
          </div>
        ) : null}
      </div>
    </AdvancedModal>
  );
};

export default ReviewDetailModal;
