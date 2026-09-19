import { FaStar } from "react-icons/fa";

const ReviewRatingStars = ({ rating, className = "" }) => {
  const value = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));

  return (
    <span className={`review-table__stars ${className}`.trim()} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar
          key={star}
          className={star <= value ? "" : "review-table__star-empty"}
          aria-hidden
        />
      ))}
    </span>
  );
};

export default ReviewRatingStars;
