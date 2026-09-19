import { useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";

import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import ProductReviewForm from "@src/features/public/components/ProductReviewForm";
import { StarRating } from "@src/features/public/components/reviewStars";
import { fetchOrderReviewContext } from "@src/features/reviews/reviewActions";

const REVIEW_STATUS_LABELS = {
  pending: "Pending approval",
  approved: "Published",
  rejected: "Not published",
};

const OrderReviewLine = ({ line, onReviewSubmitted }) => {
  const [expanded, setExpanded] = useState(false);
  const review = line.review;

  if (review) {
    const showStatus = review.status && review.status !== "approved";
    return (
      <li className="order-reviews__line order-reviews__line--submitted">
        <div className="order-reviews__line-head">
          <p className="order-reviews__product-name">{line.productName}</p>
          {line.purchaseFor ? (
            <p className="order-reviews__purchase-for">{line.purchaseFor}</p>
          ) : null}
        </div>
        <div className="order-reviews__submitted">
          <StarRating rating={review.rating} size="sm" />
          {review.title ? (
            <p className="order-reviews__review-title">{review.title}</p>
          ) : null}
          {review.comment ? (
            <p className="order-reviews__review-comment">{review.comment}</p>
          ) : null}
          {showStatus ? (
            <p className="order-reviews__review-status">
              {REVIEW_STATUS_LABELS[review.status] || review.status}
            </p>
          ) : (
            <p className="order-reviews__review-thanks">
              Thank you for your review.
            </p>
          )}
        </div>
      </li>
    );
  }

  if (!line.canReview) return null;

  return (
    <li className="order-reviews__line">
      <div className="order-reviews__line-head">
        <p className="order-reviews__product-name">{line.productName}</p>
        {line.purchaseFor ? (
          <p className="order-reviews__purchase-for">{line.purchaseFor}</p>
        ) : null}
      </div>
      {expanded ? (
        <ProductReviewForm
          variantId={line.variantId}
          onSubmitted={(submitted) => {
            onReviewSubmitted(line.variantId, submitted);
            setExpanded(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="btn btn--outline order-reviews__rate-btn"
          onClick={() => setExpanded(true)}
        >
          Rate &amp; review
        </button>
      )}
    </li>
  );
};

OrderReviewLine.propTypes = {
  line: PropTypes.shape({
    variantId: PropTypes.string.isRequired,
    productName: PropTypes.string,
    purchaseFor: PropTypes.string,
    canReview: PropTypes.bool,
    review: PropTypes.object,
  }).isRequired,
  onReviewSubmitted: PropTypes.func.isRequired,
};

const OrderReviewsSection = ({ orderNo, fetchOrderReviewContext }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canReviewOrder, setCanReviewOrder] = useState(false);
  const [items, setItems] = useState([]);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchOrderReviewContext(orderNo);
      if (!result?.status) {
        setItems([]);
        setCanReviewOrder(false);
        setError(result?.message || "Unable to load reviews.");
        return;
      }
      const payload = result.data || {};
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setCanReviewOrder(Boolean(payload.canReviewOrder));
    } catch (err) {
      setItems([]);
      setCanReviewOrder(false);
      setError(err?.message || "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [fetchOrderReviewContext, orderNo]);

  useEffect(() => {
    if (orderNo) {
      loadContext();
    }
  }, [loadContext, orderNo]);

  const onReviewSubmitted = (variantId, review) => {
    setItems((prev) => {
      const next = prev.map((row) =>
        row.variantId === variantId
          ? { ...row, canReview: false, review }
          : row,
      );
      setCanReviewOrder(next.some((row) => row.canReview));
      return next;
    });
  };

  if (loading) {
    return (
      <section
        className="order-detail-section order-detail-section--reviews"
        aria-labelledby="order-detail-reviews-heading"
      >
        <h2 id="order-detail-reviews-heading" className="order-detail-section__title">
          Rate your purchase
        </h2>
        <BouncingLoader minHeight="120px" />
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="order-detail-section order-detail-section--reviews"
        aria-labelledby="order-detail-reviews-heading"
      >
        <h2 id="order-detail-reviews-heading" className="order-detail-section__title">
          Rate your purchase
        </h2>
        <p className="order-reviews__error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!items.length) {
    return null;
  }

  const pendingCount = items.filter((row) => row.canReview).length;
  const allReviewed = !canReviewOrder;

  return (
    <section
      className="order-detail-section order-detail-section--reviews"
      aria-labelledby="order-detail-reviews-heading"
    >
      <h2 id="order-detail-reviews-heading" className="order-detail-section__title">
        Rate your purchase
        {pendingCount > 0 ? (
          <span className="order-detail-section__count">
            {pendingCount} pending
          </span>
        ) : null}
      </h2>
      {allReviewed ? (
        <p className="order-reviews__intro order-reviews__intro--done">
          You have reviewed all items from this order. Thank you!
        </p>
      ) : (
        <p className="order-reviews__intro">
          Share your experience with the items you received. Reviews help other
          customers and are published after approval.
        </p>
      )}
      <ul className="order-reviews__list">
        {items.map((line) => (
          <OrderReviewLine
            key={line.variantId}
            line={line}
            onReviewSubmitted={onReviewSubmitted}
          />
        ))}
      </ul>
    </section>
  );
};

OrderReviewsSection.propTypes = {
  orderNo: PropTypes.string.isRequired,
  fetchOrderReviewContext: PropTypes.func.isRequired,
};

export default connect(null, { fetchOrderReviewContext })(OrderReviewsSection);
