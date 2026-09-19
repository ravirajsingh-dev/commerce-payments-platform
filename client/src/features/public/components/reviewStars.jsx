import { FaStar, FaStarHalfAlt } from "react-icons/fa";

export const EMPTY_RATING_DISTRIBUTION = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

export const formatRatingValue = (value) => {
  const num = Number(value) || 0;
  if (num <= 0) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
};

export const StarRating = ({
  rating = 0,
  size = "md",
  className = "",
  showNumeric = false,
}) => {
  const rounded = Math.round(rating * 2) / 2;
  const sizeClass =
    size === "lg"
      ? "product-rating-stars--lg"
      : size === "sm"
        ? "product-rating-stars--sm"
        : "";

  return (
    <span
      className={`product-rating-stars ${sizeClass} ${className}`.trim()}
      aria-hidden={!showNumeric}
    >
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = rounded >= value;
        const half = !filled && rounded >= value - 0.5;
        const Icon = half ? FaStarHalfAlt : FaStar;
        return (
          <Icon
            key={value}
            className={
              filled || half ? "product-rating-stars__icon--filled" : ""
            }
          />
        );
      })}
      {showNumeric ? (
        <span className="product-rating-stars__numeric">
          {formatRatingValue(rating)}
        </span>
      ) : null}
    </span>
  );
};

export const distributionRows = (distribution = EMPTY_RATING_DISTRIBUTION) => {
  const total = [5, 4, 3, 2, 1].reduce(
    (sum, star) => sum + (Number(distribution[star]) || 0),
    0,
  );
  return [5, 4, 3, 2, 1].map((star) => {
    const count = Number(distribution[star]) || 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return { star, count, percent, total };
  });
};
