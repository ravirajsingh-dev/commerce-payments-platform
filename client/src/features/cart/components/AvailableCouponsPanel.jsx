import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Collapse } from "react-bootstrap";
import { FaChevronDown, FaChevronUp, FaTag } from "react-icons/fa";

import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { fetchAvailableCoupons } from "@src/features/cart/cartActions";
import { formatPrice } from "@src/utils/productDetailHelpers";

const formatDiscountLabel = (coupon) => {
  if (coupon.discountType === "percentage") {
    const cap = Number(coupon.maxDiscountAmount) || 0;
    return cap > 0
      ? `${coupon.discountValue}% off (up to ${formatPrice(cap)})`
      : `${coupon.discountValue}% off`;
  }
  return `${formatPrice(coupon.discountValue)} off`;
};

const CouponOfferCard = ({ offer, busy, onApply }) => {
  const [termsOpen, setTermsOpen] = useState(false);
  const isApplied = offer.status === "applied";
  const isInvalidApplied = offer.status === "applied_invalid";
  const hasTerms = Boolean(String(offer.termsAndConditions || "").trim());

  const statusClass =
    isApplied || isInvalidApplied
      ? "coupon-offer--applied"
      : offer.canApply
        ? "coupon-offer--available"
        : "coupon-offer--locked";

  return (
    <article className={`coupon-offer ${statusClass}`}>
      <div className="coupon-offer__head">
        <div className="coupon-offer__badge" aria-hidden>
          <FaTag />
        </div>
        <div className="coupon-offer__main">
          <p className="coupon-offer__code">{offer.code}</p>
          <p className="coupon-offer__title">{offer.title}</p>
          <p className="coupon-offer__savings">{formatDiscountLabel(offer)}</p>
          {offer.discountPreview > 0 ? (
            <p className="coupon-offer__preview">
              Save {formatPrice(offer.discountPreview)} on this order
            </p>
          ) : null}
        </div>
        <div className="coupon-offer__action">
          {isApplied ? (
            <span className="coupon-offer__status coupon-offer__status--applied">Applied</span>
          ) : isInvalidApplied ? (
            <span className="coupon-offer__status coupon-offer__status--invalid">Update cart</span>
          ) : offer.canApply ? (
            <button
              type="button"
              className="btn btn--outline btn-sm coupon-offer__apply-btn"
              disabled={busy}
              onClick={() => onApply?.(offer.code)}
            >
              {busy ? "…" : "Apply"}
            </button>
          ) : (
            <span className="coupon-offer__status coupon-offer__status--locked">Locked</span>
          )}
        </div>
      </div>

      <ul className="coupon-offer__meta">
        {Number(offer.minOrderAmount) > 0 ? (
          <li>Min. order {formatPrice(offer.minOrderAmount)}</li>
        ) : null}
        {offer.usageLimitPerUser > 0 ? (
          <li>
            {offer.userUsesRemaining != null && offer.userUsesRemaining <= 0
              ? "Per-user limit reached"
              : `${offer.userUsesRemaining ?? offer.usageLimitPerUser} use(s) left for you`}
          </li>
        ) : null}
        {offer.globalUsesRemaining != null && offer.usageLimit > 0 ? (
          <li>{offer.globalUsesRemaining} redemption(s) left</li>
        ) : null}
        {offer.endsAt ? (
          <li>
            Valid till{" "}
            {new Date(offer.endsAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </li>
        ) : null}
      </ul>

      {offer.actionHint ? (
        <p className="coupon-offer__hint" role="status">
          {offer.actionHint}
        </p>
      ) : null}

      {!offer.canApply && offer.message && !offer.actionHint ? (
        <p className="coupon-offer__hint">{offer.message}</p>
      ) : null}

      {hasTerms ? (
        <div className="coupon-offer__terms">
          <button
            type="button"
            className="coupon-offer__terms-toggle"
            onClick={() => setTermsOpen((prev) => !prev)}
            aria-expanded={termsOpen}
          >
            Terms &amp; conditions
            {termsOpen ? <FaChevronUp aria-hidden /> : <FaChevronDown aria-hidden />}
          </button>
          <Collapse in={termsOpen}>
            <p className="coupon-offer__terms-body">{offer.termsAndConditions}</p>
          </Collapse>
        </div>
      ) : null}
    </article>
  );
};

CouponOfferCard.propTypes = {
  offer: PropTypes.object.isRequired,
  busy: PropTypes.bool,
  onApply: PropTypes.func,
};

const AvailableCouponsPanel = ({
  busy = false,
  onApply,
  refreshKey = 0,
  fetchAvailableCoupons,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coupons, setCoupons] = useState([]);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await fetchAvailableCoupons();
    if (result?.status) {
      setCoupons(result.data?.coupons || []);
    } else {
      setCoupons([]);
      setError(result?.message || "Unable to load offers.");
    }
    setLoading(false);
  }, [fetchAvailableCoupons]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers, refreshKey]);

  if (!loading && !error && coupons.length === 0) {
    return null;
  }

  return (
    <section className="available-coupons" aria-labelledby="available-coupons-title">
      <button
        type="button"
        className="available-coupons__toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="available-coupons-list"
      >
        <span id="available-coupons-title" className="available-coupons__title">
          Available offers
          {!loading && coupons.length > 0 ? (
            <span className="available-coupons__count">{coupons.length}</span>
          ) : null}
        </span>
        {expanded ? <FaChevronUp aria-hidden /> : <FaChevronDown aria-hidden />}
      </button>

      <Collapse in={expanded}>
        <div id="available-coupons-list" className="available-coupons__list">
          {loading ? (
            <BouncingLoader
              minHeight="100px"
              className="available-coupons__loading"
              message="Loading offers…"
            />
          ) : error ? (
            <p className="available-coupons__error" role="alert">
              {error}
            </p>
          ) : (
            coupons.map((offer) => (
              <CouponOfferCard
                key={offer._id || offer.code}
                offer={offer}
                busy={busy}
                onApply={onApply}
              />
            ))
          )}
        </div>
      </Collapse>
    </section>
  );
};

AvailableCouponsPanel.propTypes = {
  busy: PropTypes.bool,
  onApply: PropTypes.func,
  refreshKey: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default connect(null, { fetchAvailableCoupons })(AvailableCouponsPanel);
