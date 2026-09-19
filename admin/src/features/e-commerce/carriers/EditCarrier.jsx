import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import CarrierFormFields from "@src/features/e-commerce/carriers/CarrierFormFields";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import generateSlug from "@src/utils/generateSlug";
import {
  getCarrierById,
  updateCarrier,
} from "@src/features/e-commerce/carriers/carrierActions";
import { FULFILLMENT_MODE, isOfflineFulfillmentMode } from "@src/constants/carrier";

const initialFormState = {
  name: "",
  slug: "",
  fulfillmentMode: FULFILLMENT_MODE.ONLINE.value,
  trackingUrl: "",
  isActive: true,
};

const isValidUrl = (value) => {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const EditCarrier = ({
  getCarrierById,
  updateCarrier,
  setErrors,
  removeErrors,
  carriersStore,
}) => {
  const navigate = useNavigate();
  const { carrierId } = useParams();
  const [formData, setFormData] = useState(initialFormState);
  const [loadingCarrier, setLoadingCarrier] = useState(true);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { loadingSubmit } = carriersStore;

  const validationErrors = useMemo(() => {
    const errors = {};
    const offline = isOfflineFulfillmentMode(formData.fulfillmentMode);
    if (!formData.name.trim()) errors.name = "Please enter carrier name.";
    if (!formData.slug.trim()) errors.slug = "Please enter carrier slug.";
    const trackingUrl = formData.trackingUrl.trim();
    if (!offline && !trackingUrl) {
      errors.trackingUrl = "Please enter tracking URL.";
    } else if (trackingUrl && !isValidUrl(trackingUrl)) {
      errors.trackingUrl = "Tracking URL must be a valid http(s) URL.";
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

  useEffect(() => {
    const run = async () => {
      setLoadingCarrier(true);
      const result = await getCarrierById(carrierId);
      if (result?.status && result?.data) {
        setFormData({
          name: result.data.name || "",
          slug: result.data.slug || "",
          fulfillmentMode:
            result.data.fulfillmentMode || FULFILLMENT_MODE.ONLINE.value,
          trackingUrl: result.data.trackingUrl || "",
          isActive: result.data.isActive !== false,
        });
      } else {
        navigate("/admin/carriers");
      }
      setLoadingCarrier(false);
      setFieldTouched({});
      setSubmitAttempted(false);
    };
    run();
  }, [getCarrierById, navigate, carrierId]);

  const onInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      const autoSlug = generateSlug(value);
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: autoSlug,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = [];

    if (!formData.name.trim()) {
      errors.push({ path: "name", msg: "Please enter carrier name." });
    }
    if (!formData.slug.trim()) {
      errors.push({ path: "slug", msg: "Please enter carrier slug." });
    }
    const offline = isOfflineFulfillmentMode(formData.fulfillmentMode);
    const trackingUrl = formData.trackingUrl.trim();
    if (!offline && !trackingUrl) {
      errors.push({ path: "trackingUrl", msg: "Please enter tracking URL." });
    } else if (trackingUrl && !isValidUrl(trackingUrl)) {
      errors.push({
        path: "trackingUrl",
        msg: "Tracking URL must be a valid http(s) URL.",
      });
    }

    if (errors.length) {
      setSubmitAttempted(true);
      setErrors(errors);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      fulfillmentMode: formData.fulfillmentMode,
      trackingUrl: formData.trackingUrl.trim(),
      isActive: formData.isActive === true || formData.isActive === "true",
    };

    const result = await updateCarrier(carrierId, payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/carriers");
    }
  };

  if (loadingCarrier) return <BouncingLoader minHeight="360px" />;

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Carriers", link: "/admin/carriers" },
          { label: "Edit Carrier" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Edit Carrier</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <CarrierFormFields
              formData={formData}
              onInputChange={onInputChange}
              onFieldBlur={markFieldTouched}
              localErrors={visibleLocalErrors}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/admin/carriers")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loadingSubmit || !isFormValid}
              >
                {loadingSubmit ? "Saving..." : "Update Carrier"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  carriersStore: state.carriers,
});

export default connect(mapStateToProps, {
  getCarrierById,
  updateCarrier,
  setErrors,
  removeErrors,
})(EditCarrier);
