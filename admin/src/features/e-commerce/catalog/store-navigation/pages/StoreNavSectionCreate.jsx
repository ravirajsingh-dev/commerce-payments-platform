import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import { fetchProductsForSelect } from "@src/features/e-commerce/catalog/product/productActions";
import { createStoreNavSection } from "../storeNavSectionActions";
import StoreNavSectionForm from "../components/StoreNavSectionForm";

const initialFormState = {
  title: "",
  columnIndex: 0,
  status: 1,
  sortOrder: 0,
  productIds: [],
};

const StoreNavSectionCreate = ({
  createStoreNavSection,
  fetchProductsForSelect,
  setErrors,
  removeErrors,
  storeNavSectionStore,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [productOptions, setProductOptions] = useState([]);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { loadingSubmit } = storeNavSectionStore;

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

  useEffect(() => {
    const loadProducts = async () => {
      const result = await fetchProductsForSelect({
        filters: "status",
        query: JSON.stringify({ status: { value: 1, type: "Number" } }),
      });
      const products = result?.status ? result.data : [];
      setProductOptions(
        products.map((p) => ({
          value: p._id,
          label: p.name,
        })),
      );
    };
    loadProducts();
  }, [fetchProductsForSelect]);

  const validationErrors = useMemo(() => {
    const errors = {};
    if (!formData.title.trim()) errors.title = "Please enter a menu heading.";
    if (Number(formData.sortOrder) < 0) {
      errors.sortOrder = "Sort order must be zero or greater.";
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
    if (name === "sortOrder" || name === "columnIndex" || name === "status") {
      nextValue = value === "" ? 0 : Number(value);
    }
    if (name === "productIds") {
      nextValue = Array.isArray(value) ? value : [];
    }
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setSubmitAttempted(true);
      setErrors(
        Object.entries(validationErrors).map(([path, msg]) => ({ path, msg })),
      );
      return;
    }

    const payload = {
      title: formData.title.trim(),
      columnIndex: Number(formData.columnIndex) || 0,
      status: Number(formData.status) || 1,
      sortOrder: Number(formData.sortOrder) || 0,
      productIds: formData.productIds || [],
    };

    const result = await createStoreNavSection(payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/store-navigation");
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Shop menu", link: "/admin/store-navigation" },
          { label: "Add section" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Add menu section</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <StoreNavSectionForm
              formData={formData}
              onInputChange={onInputChange}
              onFieldBlur={markFieldTouched}
              localErrors={visibleLocalErrors}
              productOptions={productOptions}
            />
            <div className="d-flex justify-content-end gap-2 mt-4 pt-2">
              <Button
                type="button"
                className="btn btn--outline px-4 py-2"
                onClick={() => navigate("/admin/store-navigation")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme px-4 py-2"
                disabled={loadingSubmit || !isFormValid}
              >
                {loadingSubmit ? "Saving..." : "Create section"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  storeNavSectionStore: state.storeNavSection,
});

export default connect(mapStateToProps, {
  createStoreNavSection,
  fetchProductsForSelect,
  setErrors,
  removeErrors,
})(StoreNavSectionCreate);
