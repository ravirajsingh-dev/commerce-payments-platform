import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import { fetchProductsForSelect } from "@src/features/e-commerce/catalog/product/productActions";
import {
  getStoreNavSectionById,
  updateStoreNavSection,
} from "../storeNavSectionActions";
import StoreNavSectionForm from "../components/StoreNavSectionForm";

const initialFormState = {
  title: "",
  columnIndex: 0,
  status: 1,
  sortOrder: 0,
  productIds: [],
};

const StoreNavSectionEdit = ({
  getStoreNavSectionById,
  updateStoreNavSection,
  fetchProductsForSelect,
  setErrors,
  removeErrors,
  storeNavSectionStore,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState(initialFormState);
  const [productOptions, setProductOptions] = useState([]);
  const [loadingSection, setLoadingSection] = useState(true);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { loadingSubmit } = storeNavSectionStore;

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

  useEffect(() => {
    const loadProducts = async () => {
      const result = await fetchProductsForSelect();
      const products = result?.status ? result.data : [];
      setProductOptions(
        products.map((p) => ({
          value: String(p._id),
          label: p.name,
        })),
      );
    };
    loadProducts();
  }, [fetchProductsForSelect]);

  useEffect(() => {
    const run = async () => {
      setLoadingSection(true);
      const result = await getStoreNavSectionById(id);
      if (result?.status && result?.data) {
        const section = result.data;
        const ids = (section.productIds || []).map(String);
        setFormData({
          title: section.title || "",
          columnIndex: Number(section.columnIndex) || 0,
          status: Number(section.status) || 1,
          sortOrder: Number(section.sortOrder) || 0,
          productIds: ids,
        });
        setProductOptions((prev) => {
          const map = new Map((prev || []).map((o) => [String(o.value), o]));
          ids.forEach((pid) => {
            if (!map.has(pid)) {
              map.set(pid, { value: pid, label: `Product ${pid.slice(-6)}` });
            }
          });
          return Array.from(map.values());
        });
      } else {
        navigate("/admin/store-navigation");
      }
      setLoadingSection(false);
      setFieldTouched({});
      setSubmitAttempted(false);
    };
    if (id) run();
  }, [getStoreNavSectionById, id, navigate]);

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
      nextValue = Array.isArray(value) ? value.map(String) : [];
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

    const result = await updateStoreNavSection(id, payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/store-navigation");
    }
  };

  if (loadingSection) {
    return <BouncingLoader minHeight="400px" />;
  }

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Shop menu", link: "/admin/store-navigation" },
          { label: "Edit section" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Edit menu section</Card.Header>
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
                {loadingSubmit ? "Saving..." : "Save changes"}
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
  getStoreNavSectionById,
  updateStoreNavSection,
  fetchProductsForSelect,
  setErrors,
  removeErrors,
})(StoreNavSectionEdit);
