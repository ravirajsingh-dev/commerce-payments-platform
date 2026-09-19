import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Form } from "react-bootstrap";

const CouponCodeForm = ({
  appliedCode = "",
  couponValid = true,
  couponMessage = "",
  busy = false,
  onApply,
  onRemove,
}) => {
  const [code, setCode] = useState(appliedCode || "");

  useEffect(() => {
    if (appliedCode) {
      setCode(appliedCode);
    }
  }, [appliedCode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = String(code || "").trim();
    if (!next || busy) return;
    onApply?.(next);
  };

  const handleRemove = () => {
    setCode("");
    onRemove?.();
  };

  return (
    <div className="coupon-code-form">
      <p className="coupon-code-form__label">Promo code</p>
      {appliedCode ? (
        <div className="coupon-code-form__applied">
          <span className="coupon-code-form__code">{appliedCode}</span>
          <button
            type="button"
            className="btn btn--outline btn-sm coupon-code-form__remove"
            onClick={handleRemove}
            disabled={busy}
          >
            Remove
          </button>
        </div>
      ) : (
        <form className="coupon-code-form__row" onSubmit={handleSubmit}>
          <Form.Control
            name="couponCode"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            maxLength={32}
            disabled={busy}
            className="coupon-code-form__input"
            style={{ textTransform: "uppercase" }}
          />
          <button
            type="submit"
            className="btn btn--outline coupon-code-form__apply"
            disabled={busy || !String(code).trim()}
          >
            {busy ? "Applying…" : "Apply"}
          </button>
        </form>
      )}
      {!couponValid && couponMessage ? (
        <p className="coupon-code-form__error" role="alert">
          {couponMessage}
        </p>
      ) : null}
    </div>
  );
};

CouponCodeForm.propTypes = {
  appliedCode: PropTypes.string,
  couponValid: PropTypes.bool,
  couponMessage: PropTypes.string,
  busy: PropTypes.bool,
  onApply: PropTypes.func,
  onRemove: PropTypes.func,
};

export default CouponCodeForm;
