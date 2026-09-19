import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  createAttributeSet,
} from "@src/features/e-commerce/catalog/attribute-set/attributeSetActions";
import AttributeSetForm from "@src/features/e-commerce/catalog/attribute-set/components/AttributeSetForm";

const normalizeCode = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const initialFormState = {
  name: "",
  code: "",
  isActive: true,
};

const AttributeSetCreate = ({
  createAttributeSet,
  setErrors,
  removeErrors,
  attributeSetStore,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { loadingSubmit } = attributeSetStore;

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

  const validationErrors = useMemo(() => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Please enter attribute set name.";
    if (!formData.code.trim()) errors.code = "Please enter attribute set code.";
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
    if (name === "name") {
      const autoCode = normalizeCode(value);
      setFormData((prev) => ({
        ...prev,
        name: value,
        code: autoCode,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = [];

    if (!formData.name.trim()) {
      errors.push({ path: "name", msg: "Please enter attribute set name." });
    }
    if (!formData.code.trim()) {
      errors.push({ path: "code", msg: "Please enter attribute set code." });
    }

    if (errors.length) {
      setSubmitAttempted(true);
      setErrors(errors);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      isActive: formData.isActive === true || formData.isActive === "true",
    };

    const result = await createAttributeSet(payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/attribute-sets");
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Attribute Sets", link: "/admin/attribute-sets" },
          { label: "Create Attribute Set" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Create Attribute Set</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <AttributeSetForm
              formData={formData}
              onInputChange={onInputChange}
              onFieldBlur={markFieldTouched}
              localErrors={visibleLocalErrors}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/admin/attribute-sets")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loadingSubmit || !isFormValid}
              >
                {loadingSubmit ? "Saving..." : "Create Attribute Set"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  attributeSetStore: state.attributeSet,
});

export default connect(mapStateToProps, {
  createAttributeSet,
  setErrors,
  removeErrors,
})(AttributeSetCreate);
