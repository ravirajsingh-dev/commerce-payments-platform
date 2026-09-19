import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  getCategoryById,
  getCategoryList,
  updateCategory,
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

const CategoryEdit = ({
  getCategoryById,
  getCategoryList,
  updateCategory,
  setErrors,
  removeErrors,
  categoryStore,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState(initialFormState);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { loadingSubmit, categoryList } = categoryStore;

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
      ...(categoryList || [])
        .filter((cat) => String(cat._id) !== String(id))
        .map((item) => ({
          value: item._id,
          label: item.name,
        })),
    ],
    [categoryList, id],
  );

  useEffect(() => {
    const run = async () => {
      setLoadingCategory(true);
      const result = await getCategoryById(id);
      if (result?.status && result?.data) {
        setFormData({
          name: result.data.name || "",
          slug: result.data.slug || "",
          parentCategoryId: result.data.parentCategoryId?._id || "",
          status: result.data.status || 1,
          sortOrder: result.data.sortOrder ?? 0,
        });
      } else {
        navigate("/admin/categories");
      }
      setLoadingCategory(false);
      setFieldTouched({});
      setSubmitAttempted(false);
    };
    run();
  }, [getCategoryById, id, navigate]);

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

    const result = await updateCategory(id, payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/categories");
    }
  };

  if (loadingCategory) return <BouncingLoader minHeight="360px" />;

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Categories", link: "/admin/categories" },
          { label: "Edit Category" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Edit Category</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <CategoryForm
              formData={formData}
              onInputChange={onInputChange}
              onFieldBlur={markFieldTouched}
              localErrors={visibleLocalErrors}
              parentCategoryOptions={parentCategoryOptions}
              currentCategoryId={id}
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
                {loadingSubmit ? "Saving..." : "Update Category"}
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
  getCategoryById,
  getCategoryList,
  updateCategory,
  setErrors,
  removeErrors,
})(CategoryEdit);
