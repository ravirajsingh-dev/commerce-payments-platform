import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  createAttribute,
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

const AttributeCreate = ({
  createAttribute,
  getAttributeSetList,
  setErrors,
  removeErrors,
  attributeStore,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedAttributeSetId = String(
    searchParams.get("attributeSetId") || "",
  ).trim();
  const [formData, setFormData] = useState(initialFormState);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [attributeSetOptions, setAttributeSetOptions] = useState([]);
  const { loadingSubmit } = attributeStore;

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

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
      if (!preselectedAttributeSetId) return;
      const hasPreselected = options.some(
        (item) => String(item.value) === preselectedAttributeSetId,
      );
      if (!hasPreselected) return;
      setFormData((prev) =>
        prev.attributeSetId
          ? prev
          : { ...prev, attributeSetId: preselectedAttributeSetId },
      );
    };

    loadAttributeSets();
  }, [getAttributeSetList, preselectedAttributeSetId]);

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

    const result = await createAttribute(payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/attributes");
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Attributes", link: "/admin/attributes" },
          { label: "Create Attribute" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Create Attribute</Card.Header>
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
                {loadingSubmit ? "Saving..." : "Create Attribute"}
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
  createAttribute,
  getAttributeSetList,
  setErrors,
  removeErrors,
})(AttributeCreate);
