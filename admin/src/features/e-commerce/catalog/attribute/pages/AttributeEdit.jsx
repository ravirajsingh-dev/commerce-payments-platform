import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  getAttributeById,
  updateAttribute,
} from "@src/features/e-commerce/catalog/attribute/attributeActions";
import { getAttributeSetList } from "@src/features/e-commerce/catalog/attribute-set/attributeSetActions";
import AttributeForm from "@src/features/e-commerce/catalog/attribute/components/AttributeForm";

const normalizeCode = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const initialFormState = {
  attributeSetId: "",
  name: "",
  code: "",
  inputType: "text",
  isRequired: false,
  isFilterable: false,
  isVariant: false,
  options: [],
  isActive: true,
};

const AttributeEdit = ({
  getAttributeById,
  updateAttribute,
  getAttributeSetList,
  setErrors,
  removeErrors,
  attributeStore,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState(initialFormState);
  const [loadingAttribute, setLoadingAttribute] = useState(true);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [attributeSetOptions, setAttributeSetOptions] = useState([]);

  const { loadingSubmit } = attributeStore;

  const validationErrors = useMemo(() => {
    const errors = {};
    if (!formData.attributeSetId)
      errors.attributeSetId = "Please select attribute set.";
    if (!formData.name.trim()) errors.name = "Please enter attribute name.";
    if (!formData.code.trim()) errors.code = "Please enter attribute code.";
    if (!formData.inputType) errors.inputType = "Please select input type.";
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
    const loadAttributeSets = async () => {
      let options = [];

      const activeResult = await getAttributeSetList({ status: 1 });
      const activeList = activeResult?.data?.attributeSets || [];

      if (activeList.length > 0) {
        options = activeList.map((item) => ({
          label: item.name,
          value: item._id,
        }));
      } else {
        const fallbackResult = await getAttributeSetList({
          limit: 100,
          page: 1,
          orderBy: "name",
          ascending: "asc",
        });
        const fallbackList = fallbackResult?.data?.attributeSets || [];
        options = fallbackList.map((item) => ({
          label: item.name,
          value: item._id,
        }));
      }

      setAttributeSetOptions(options);
    };

    loadAttributeSets();
  }, [getAttributeSetList]);

  useEffect(() => {
    const run = async () => {
      setLoadingAttribute(true);
      const result = await getAttributeById(id);
      if (result?.status && result?.data) {
        setFormData({
          attributeSetId: result.data.attributeSetId?._id || "",
          name: result.data.name || "",
          code: result.data.code || "",
          inputType: result.data.inputType || "text",
          isRequired: Boolean(result.data.isRequired),
          isFilterable: Boolean(result.data.isFilterable),
          isVariant: Boolean(result.data.isVariant),
          options: Array.isArray(result.data.options) ? result.data.options : [],
          isActive: result.data.isActive !== false,
        });
      } else {
        navigate("/admin/attributes");
      }
      setLoadingAttribute(false);
      setFieldTouched({});
      setSubmitAttempted(false);
    };
    run();
  }, [getAttributeById, id, navigate]);

  const onInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      setFormData((prev) => ({
        ...prev,
        name: value,
        code: normalizeCode(value),
      }));
      return;
    }
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "inputType" && value !== "select") {
        next.options = [];
      }
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = [];

    if (!formData.attributeSetId) {
      errors.push({ path: "attributeSetId", msg: "Please select attribute set." });
    }
    if (!formData.name.trim()) {
      errors.push({ path: "name", msg: "Please enter attribute name." });
    }
    if (!formData.code.trim()) {
      errors.push({ path: "code", msg: "Please enter attribute code." });
    }
    if (!formData.inputType) {
      errors.push({ path: "inputType", msg: "Please select input type." });
    }

    if (errors.length) {
      setSubmitAttempted(true);
      setErrors(errors);
      return;
    }

    const payload = {
      attributeSetId: formData.attributeSetId,
      name: formData.name.trim(),
      code: formData.code.trim().toLowerCase(),
      inputType: formData.inputType,
      isRequired: Boolean(formData.isRequired),
      isFilterable: Boolean(formData.isFilterable),
      isVariant: Boolean(formData.isVariant),
      options: formData.inputType === "select" ? formData.options || [] : [],
      isActive: formData.isActive === true || formData.isActive === "true",
    };

    const result = await updateAttribute(id, payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/attributes");
    }
  };

  if (loadingAttribute) return <BouncingLoader minHeight="360px" />;

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Attributes", link: "/admin/attributes" },
          { label: "Edit Attribute" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Edit Attribute</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <AttributeForm
              formData={formData}
              onInputChange={onInputChange}
              onFieldBlur={markFieldTouched}
              localErrors={visibleLocalErrors}
              attributeSetOptions={attributeSetOptions}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/admin/attributes")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loadingSubmit || !isFormValid}
              >
                {loadingSubmit ? "Saving..." : "Update Attribute"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  attributeStore: state.attribute,
});

export default connect(mapStateToProps, {
  getAttributeById,
  updateAttribute,
  getAttributeSetList,
  setErrors,
  removeErrors,
})(AttributeEdit);
