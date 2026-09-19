import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import CouponForm from "../components/CouponForm";
import {
  clearCouponDetail,
  getCouponById,
  updateCoupon,
} from "../couponActions";
import { couponFromApi, toApiPayload } from "../couponHelpers";

const CouponEdit = ({
  getCouponById,
  updateCoupon,
  clearCouponDetail,
  setErrors,
  removeErrors,
  couponStore,
}) => {
  const { couponId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { couponDetail, loadingDetail, loadingSubmit } = couponStore;

  useEffect(() => {
    removeErrors();
    getCouponById(couponId);
    return () => clearCouponDetail();
  }, [couponId, getCouponById, clearCouponDetail, removeErrors]);

  useEffect(() => {
    if (couponDetail) {
      setFormData(couponFromApi(couponDetail));
    }
  }, [couponDetail]);

  const validationErrors = useMemo(() => {
    if (!formData) return {};
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
    const usageLimit = parseInt(formData.usageLimit, 10) || 0;
    const used = Number(couponDetail?.usedCount || 0);
    if (usageLimit > 0 && usageLimit < used) {
      errors.usageLimit = `Usage limit cannot be less than ${used} (already used).`;
    }
    return errors;
  }, [formData, couponDetail]);

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

    const code = String(formData?.code || "").trim();
    if (!code || code.length < 3) {
      errors.push({ path: "code", msg: "Code must be at least 3 characters." });
    }
    if (!String(formData?.title || "").trim()) {
      errors.push({ path: "title", msg: "Title is required." });
    }
    const value = Number(formData?.discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      errors.push({ path: "discountValue", msg: "Enter a valid discount value." });
    } else if (formData?.discountType === "percentage" && value > 100) {
      errors.push({ path: "discountValue", msg: "Percentage cannot exceed 100." });
    }
    if (formData?.startsAt && formData?.endsAt) {
      const start = new Date(formData.startsAt);
      const end = new Date(formData.endsAt);
      if (end < start) {
        errors.push({ path: "endsAt", msg: "End must be on or after start." });
      }
    }
    const usageLimit = parseInt(formData?.usageLimit, 10) || 0;
    const used = Number(couponDetail?.usedCount || 0);
    if (usageLimit > 0 && usageLimit < used) {
      errors.push({
        path: "usageLimit",
        msg: `Usage limit cannot be less than ${used} (already used).`,
      });
    }

    if (errors.length) {
      setSubmitAttempted(true);
      setErrors(errors);
      return;
    }

    const result = await updateCoupon(couponId, toApiPayload(formData));
    if (result?.status) {
      removeErrors();
      navigate("/admin/coupons");
    }
  };

  if (loadingDetail || !formData) {
    return (
      <Container>
        <BouncingLoader minHeight="420px" />
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Coupons", link: "/admin/coupons" },
          { label: couponDetail?.code || "Edit Coupon" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Edit Coupon</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <CouponForm
              formData={formData}
              onInputChange={onInputChange}
              onFieldBlur={markFieldTouched}
              localErrors={visibleLocalErrors}
              usedCount={couponDetail?.usedCount || 0}
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
                {loadingSubmit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({ couponStore: state.coupons });
export default connect(mapStateToProps, {
  getCouponById,
  updateCoupon,
  clearCouponDetail,
  setErrors,
  removeErrors,
})(CouponEdit);
