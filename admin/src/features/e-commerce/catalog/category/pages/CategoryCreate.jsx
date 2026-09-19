import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  createCategory,
  getCategoryList,
} from "@src/features/e-commerce/catalog/category/categoryActions";
import CategoryForm from "@src/features/e-commerce/catalog/category/components/CategoryForm";
import generateSlug from "@src/utils/generateSlug";

const initialFormState = {
  name: "",
  slug: "",
  parentCategoryId: "",
  status: 1,
  sortOrder: 0,
};

const CategoryCreate = ({
  createCategory,
  getCategoryList,
  setErrors,
  removeErrors,
  categoryStore,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { loadingSubmit, categoryList } = categoryStore;

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

  useEffect(() => {
    getCategoryList({
      limit: 100,
      page: 1,
      orderBy: "name",
      ascending: "asc",
      filters: "status",
      query: JSON.stringify({
        status: { value: 1, type: "Number" },
      }),
    });
  }, [getCategoryList]);

  const parentCategoryOptions = useMemo(
    () => [
      { label: "No Parent", value: "" },
      ...(categoryList || []).map((item) => ({
        value: item._id,
        label: item.name,
      })),
    ],
    [categoryList],
  );

  const validationErrors = useMemo(() => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Please enter category name.";
    if (!formData.slug.trim()) errors.slug = "Please enter category slug.";
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

    if (name === "name") {
      nextValue = value;
      const autoSlug = generateSlug(value);
      setFormData((prev) => ({
        ...prev,
        name: nextValue,
        slug: autoSlug,
      }));
      return;
    }

    if (name === "sortOrder") {
      nextValue = value === "" ? 0 : Number(value);
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = [];

    if (!formData.name.trim()) {
      errors.push({ path: "name", msg: "Please enter category name." });
    }
    if (!formData.slug.trim()) {
      errors.push({ path: "slug", msg: "Please enter category slug." });
    }
    if (Number(formData.sortOrder) < 0) {
      errors.push({
        path: "sortOrder",
        msg: "Sort order must be zero or greater.",
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
      parentCategoryId: formData.parentCategoryId || null,
      status: Number(formData.status) || 1,
      sortOrder: Number(formData.sortOrder) || 0,
    };

    const result = await createCategory(payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/categories");
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Categories", link: "/admin/categories" },
          { label: "Create Category" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Create Category</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <CategoryForm
              formData={formData}
              onInputChange={onInputChange}
              onFieldBlur={markFieldTouched}
              localErrors={visibleLocalErrors}
              parentCategoryOptions={parentCategoryOptions}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/admin/categories")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loadingSubmit || !isFormValid}
              >
                {loadingSubmit ? "Saving..." : "Create Category"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  categoryStore: state.category,
});

export default connect(mapStateToProps, {
  createCategory,
  getCategoryList,
  setErrors,
  removeErrors,
})(CategoryCreate);
