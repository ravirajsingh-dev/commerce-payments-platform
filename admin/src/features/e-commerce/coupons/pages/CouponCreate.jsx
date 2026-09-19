import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import CouponForm from "../components/CouponForm";
import { createCoupon } from "../couponActions";
import { toApiPayload } from "../couponHelpers";

const initialFormState = {
  code: "",
  title: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: 0,
  maxDiscountAmount: 0,
  usageLimit: 0,
  usageLimitPerUser: 0,
  termsAndConditions: "",
  status: 1,
  startsAt: "",
  endsAt: "",
};

const CouponCreate = ({ createCoupon, setErrors, removeErrors, couponStore }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { loadingSubmit } = couponStore;

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

  const validationErrors = useMemo(() => {
    const errors = {};
    const code = String(formData.code || "").trim();
    if (!code || code.length < 3) errors.code = "Code must be at least 3 characters.";
    if (!String(formData.title || "").trim()) errors.title = "Title is required.";
    const value = Number(formData.discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      errors.discountValue = "Enter a valid discount value.";
    } else if (formData.discountType === "percentage" && value > 100) {
      errors.discountValue = "Percentage cannot exceed 100.";
    }
    if (formData.startsAt && formData.endsAt) {
      const start = new Date(formData.startsAt);
      const end = new Date(formData.endsAt);
      if (end < start) errors.endsAt = "End must be on or after start.";
    }
    return errors;
  }, [formData]);

  const visibleLocalErrors = useMemo(() => {
    const next = {};
    Object.entries(validationErrors).forEach(([key, msg]) => {
      if (fieldTouched[key] || submitAttempted) next[key] = msg;
    });
    return next;
  }, [validationErrors, fieldTouched, submitAttempted]);

  const isFormValid = Object.keys(validationErrors).length === 0;

  const markFieldTouched = (name) => {
    if (!name) return;
    setFieldTouched((prev) => ({ ...prev, [name]: true }));
  };

  const onInputChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (
      ["minOrderAmount", "maxDiscountAmount", "usageLimit", "usageLimitPerUser", "status"].includes(
        name,
      )
    ) {
      nextValue = value === "" ? 0 : Number(value);
    }
    if (name === "discountValue") {
      nextValue = value === "" ? "" : Number(value);
    }
    if (name === "code") {
      nextValue = value.toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = [];

    const code = String(formData.code || "").trim();
    if (!code || code.length < 3) {
      errors.push({ path: "code", msg: "Code must be at least 3 characters." });
    }
    if (!String(formData.title || "").trim()) {
      errors.push({ path: "title", msg: "Title is required." });
    }
    const value = Number(formData.discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      errors.push({ path: "discountValue", msg: "Enter a valid discount value." });
    } else if (formData.discountType === "percentage" && value > 100) {
      errors.push({ path: "discountValue", msg: "Percentage cannot exceed 100." });
    }
    if (formData.startsAt && formData.endsAt) {
      const start = new Date(formData.startsAt);
      const end = new Date(formData.endsAt);
      if (end < start) {
        errors.push({ path: "endsAt", msg: "End must be on or after start." });
      }
    }

    if (errors.length) {
      setSubmitAttempted(true);
      setErrors(errors);
      return;
    }

    const result = await createCoupon(toApiPayload(formData));
    if (result?.status) {
      removeErrors();
      navigate("/admin/coupons");
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Coupons", link: "/admin/coupons" },
          { label: "Create Coupon" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Create Coupon</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <CouponForm
              formData={formData}
              onInputChange={onInputChange}
              onFieldBlur={markFieldTouched}
              localErrors={visibleLocalErrors}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/admin/coupons")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loadingSubmit || !isFormValid}
              >
                {loadingSubmit ? "Saving..." : "Create Coupon"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({ couponStore: state.coupons });
export default connect(mapStateToProps, { createCoupon, setErrors, removeErrors })(
  CouponCreate,
);
