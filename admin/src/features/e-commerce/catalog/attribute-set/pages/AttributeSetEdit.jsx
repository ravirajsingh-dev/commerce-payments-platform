import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  getAttributeSetById,
  updateAttributeSet,
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

const AttributeSetEdit = ({
  getAttributeSetById,
  updateAttributeSet,
  setErrors,
  removeErrors,
  attributeSetStore,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState(initialFormState);
  const [loadingAttributeSet, setLoadingAttributeSet] = useState(true);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { loadingSubmit } = attributeSetStore;

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

  useEffect(() => {
    const run = async () => {
      setLoadingAttributeSet(true);
      const result = await getAttributeSetById(id);
      if (result?.status && result?.data) {
        setFormData({
          name: result.data.name || "",
          code: result.data.code || "",
          isActive: result.data.isActive !== false,
        });
      } else {
        navigate("/admin/attribute-sets");
      }
      setLoadingAttributeSet(false);
      setFieldTouched({});
      setSubmitAttempted(false);
    };
    run();
  }, [getAttributeSetById, id, navigate]);

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

    const result = await updateAttributeSet(id, payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/attribute-sets");
    }
  };

  if (loadingAttributeSet) return <BouncingLoader minHeight="360px" />;

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Attribute Sets", link: "/admin/attribute-sets" },
          { label: "Edit Attribute Set" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Edit Attribute Set</Card.Header>
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
                {loadingSubmit ? "Saving..." : "Update Attribute Set"}
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
  getAttributeSetById,
  updateAttributeSet,
  setErrors,
  removeErrors,
})(AttributeSetEdit);
