import { useCallback } from "react";
import { Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";
import {
  COUPON_STATUS_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
  getCouponStatusOptionByValue,
  getDiscountTypeOptionByValue,
} from "../couponHelpers";

const CouponForm = ({
  formData,
  onInputChange,
  onFieldBlur,
  localErrors = {},
  usedCount = 0,
}) => {
  const isPercentage = formData.discountType === "percentage";

  const loadStatusOptions = useCallback(() => COUPON_STATUS_OPTIONS, []);
  const loadDiscountTypeOptions = useCallback(() => DISCOUNT_TYPE_OPTIONS, []);

  const handleBlur = (e) => {
    onFieldBlur?.(e.target?.name);
  };

  return (
    <Row className="g-3 coupon-form">
      <Col md={6}>
        <Form.Group>
          <Form.Label>Code *</Form.Label>
          <Form.Control
            name="code"
            value={formData.code}
            onChange={onInputChange}
            onBlur={handleBlur}
            placeholder="SAVE10"
            maxLength={32}
            style={{ textTransform: "uppercase" }}
          />
          <Form.Text className="coupon-form__hint">
            Stored uppercase. 3–32 characters.
          </Form.Text>
          <Errors current_key="code" message={localErrors.code} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Title *</Form.Label>
          <Form.Control
            name="title"
            value={formData.title}
            onChange={onInputChange}
            onBlur={handleBlur}
            maxLength={120}
          />
          <Errors current_key="title" message={localErrors.title} />
        </Form.Group>
      </Col>
      <Col xs={12}>
        <Form.Group>
          <Form.Label>Terms &amp; conditions</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            name="termsAndConditions"
            value={formData.termsAndConditions}
            onChange={onInputChange}
            onBlur={handleBlur}
            maxLength={2000}
            placeholder="Eligibility, exclusions, one-time use, etc. Shown to customers on cart and checkout."
          />
          <Form.Text className="coupon-form__hint">
            Optional. Displayed to customers when browsing offers (max 2000 characters).
          </Form.Text>
          <Errors current_key="termsAndConditions" message={localErrors.termsAndConditions} />
        </Form.Group>
      </Col>
      <Col md={4}>
        <Form.Group>
          <Form.Label>Discount type *</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getDiscountTypeOptionByValue(formData.discountType)}
            onChange={(option) =>
              onInputChange({
                target: { name: "discountType", value: option?.value ?? "percentage" },
              })
            }
            loadOptions={loadDiscountTypeOptions}
            placeholder="Select discount type"
            isRequired
          />
          <Errors current_key="discountType" message={localErrors.discountType} />
        </Form.Group>
      </Col>
      <Col md={4}>
        <Form.Group>
          <Form.Label>{isPercentage ? "Discount (%)" : "Discount amount (₹)"} *</Form.Label>
          <Form.Control
            type="number"
            name="discountValue"
            value={formData.discountValue}
            onChange={onInputChange}
            onBlur={handleBlur}
            min={isPercentage ? 1 : 1}
            max={isPercentage ? 100 : undefined}
            step={isPercentage ? 1 : 0.01}
          />
          <Errors current_key="discountValue" message={localErrors.discountValue} />
        </Form.Group>
      </Col>
      <Col md={4}>
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getCouponStatusOptionByValue(formData.status)}
            onChange={(option) =>
              onInputChange({
                target: { name: "status", value: option?.value ?? 1 },
              })
            }
            loadOptions={loadStatusOptions}
            placeholder="Select status"
            isRequired
          />
        </Form.Group>
      </Col>
      <Col md={4}>
        <Form.Group>
          <Form.Label>Minimum cart (₹)</Form.Label>
          <Form.Control
            type="number"
            name="minOrderAmount"
            value={formData.minOrderAmount}
            onChange={onInputChange}
            onBlur={handleBlur}
            min={0}
            step={1}
          />
          <Errors current_key="minOrderAmount" message={localErrors.minOrderAmount} />
        </Form.Group>
      </Col>
      <Col md={4}>
        <Form.Group>
          <Form.Label>Max discount cap (₹)</Form.Label>
          <Form.Control
            type="number"
            name="maxDiscountAmount"
            value={formData.maxDiscountAmount}
            onChange={onInputChange}
            onBlur={handleBlur}
            min={0}
            step={1}
            disabled={!isPercentage}
          />
          <Form.Text className="coupon-form__hint">
            {isPercentage ? "0 = no cap (percentage only)." : "Not applicable for flat coupons."}
          </Form.Text>
          <Errors current_key="maxDiscountAmount" message={localErrors.maxDiscountAmount} />
        </Form.Group>
      </Col>
      <Col md={4}>
        <Form.Group>
          <Form.Label>Total usage limit</Form.Label>
          <Form.Control
            type="number"
            name="usageLimit"
            value={formData.usageLimit}
            onChange={onInputChange}
            onBlur={handleBlur}
            min={usedCount || 0}
            step={1}
          />
          <Form.Text className="coupon-form__hint">
            0 = unlimited across all customers. Used: {usedCount}.
          </Form.Text>
          <Errors current_key="usageLimit" message={localErrors.usageLimit} />
        </Form.Group>
      </Col>
      <Col md={4}>
        <Form.Group>
          <Form.Label>Usage limit per user</Form.Label>
          <Form.Control
            type="number"
            name="usageLimitPerUser"
            value={formData.usageLimitPerUser}
            onChange={onInputChange}
            onBlur={handleBlur}
            min={0}
            step={1}
          />
          <Form.Text className="coupon-form__hint">
            0 = unlimited per customer. Counts completed orders only.
          </Form.Text>
          <Errors current_key="usageLimitPerUser" message={localErrors.usageLimitPerUser} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Starts at</Form.Label>
          <Form.Control
            type="datetime-local"
            name="startsAt"
            value={formData.startsAt}
            onChange={onInputChange}
            onBlur={handleBlur}
          />
          <Errors current_key="startsAt" message={localErrors.startsAt} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Expires at</Form.Label>
          <Form.Control
            type="datetime-local"
            name="endsAt"
            value={formData.endsAt}
            onChange={onInputChange}
            onBlur={handleBlur}
          />
          <Errors current_key="endsAt" message={localErrors.endsAt} />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default CouponForm;
