import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  getProductById,
  getClaimPolicyList,
  updateProduct,
} from "@src/features/e-commerce/catalog/product/productActions";
import { getCategoryList } from "@src/features/e-commerce/catalog/category/categoryActions";
import { getAttributeSetList } from "@src/features/e-commerce/catalog/attribute-set/attributeSetActions";
import { getAttributeList } from "@src/features/e-commerce/catalog/attribute/attributeActions";
import ProductForm from "@src/features/e-commerce/catalog/product/components/ProductForm";
import generateSlug from "@src/utils/generateSlug";

const initialFormState = {
  name: "",
  slug: "",
  primaryCategoryId: "",
  categoryIds: [],
  attributeSetId: "",
  attributes: {},
  description: "",
  deliveryDescription: "",
  purchaseNote: "",
  seo: {
    metaTitle: "",
    metaDescription: "",
    metaKeywords: [],
  },
  searchKeywords: [],
  status: 1,
  claimsEnabled: false,
  claimPolicyId: "",
  // Optional, admin-managed size chart. Empty means no chart shown on the storefront.
  sizeChart: { sizes: [], rows: [] },
};

const normalizeIncomingSizeChart = (chart) => {
  if (!chart || typeof chart !== "object") return { sizes: [], rows: [] };
  const sizes = Array.isArray(chart.sizes)
    ? chart.sizes
        .map((row) => ({
          value: String(row?.value || "").trim().toLowerCase(),
          label: String(row?.label || row?.value || "").trim(),
        }))
        .filter((row) => row.value)
    : [];
  const rows = Array.isArray(chart.rows)
    ? chart.rows
        .map((row) => {
          const label = String(row?.label || "").trim();
          if (!label) return null;
          const values = {};
          Object.entries(row?.values || {}).forEach(([k, v]) => {
            const key = String(k || "").trim().toLowerCase();
            const num = Number(v);
            if (key && Number.isFinite(num) && num >= 0) values[key] = num;
          });
          return { code: String(row?.code || "").toLowerCase(), label, values };
        })
        .filter(Boolean)
    : [];
  return { sizes, rows };
};

const ProductEdit = ({
  getProductById,
  updateProduct,
  getClaimPolicyList,
  getCategoryList,
  getAttributeSetList,
  getAttributeList,
  setErrors,
  removeErrors,
  productStore,
  categoryStore,
  attributeSetStore,
  attributeStore,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState(initialFormState);
  const [searchKeywordsInput, setSearchKeywordsInput] = useState("");
  const [seoKeywordsInput, setSeoKeywordsInput] = useState("");
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [claimPolicyOptions, setClaimPolicyOptions] = useState([]);

  const { loadingSubmit } = productStore;
  const { categoryList } = categoryStore;
  const { attributeSetList } = attributeSetStore;
  const { attributeList } = attributeStore;

  const validationErrors = useMemo(() => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Please enter product name.";
    if (!formData.slug.trim()) errors.slug = "Please enter product slug.";
    if (!formData.primaryCategoryId)
      errors.primaryCategoryId = "Please select primary category.";
    if (!formData.attributeSetId)
      errors.attributeSetId = "Please select attribute set.";
    if (formData.claimsEnabled && !formData.claimPolicyId)
      errors.claimPolicyId = "Please select claim policy.";
    (attributeList || [])
      .filter(
        (attribute) => attribute?.isVariant === false && attribute?.isRequired,
      )
      .forEach((attribute) => {
        const code = attribute?.code;
        if (!code) return;
        if (!String(formData.attributes?.[code] ?? "").trim()) {
          errors[`attributes.${code}`] = "Please enter value.";
        }
      });
    return errors;
  }, [formData, attributeList]);

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
    const loadDropdowns = async () => {
      const activeCategoriesResult = await getCategoryList({
        limit: 100,
        page: 1,
        orderBy: "name",
        ascending: "asc",
        filters: "status",
        query: JSON.stringify({
          status: { value: 1, type: "Number" },
        }),
      });
      const activeCategories = activeCategoriesResult?.data?.categories || [];
      if (activeCategories.length === 0) {
        await getCategoryList({
          limit: 100,
          page: 1,
          orderBy: "name",
          ascending: "asc",
        });
      }

      const activeAttributeSetsResult = await getAttributeSetList({
        status: 1,
      });
      const activeAttributeSets =
        activeAttributeSetsResult?.data?.attributeSets || [];
      if (activeAttributeSets.length === 0) {
        await getAttributeSetList({
          limit: 100,
          page: 1,
          orderBy: "name",
          ascending: "asc",
        });
      }
    };

    loadDropdowns();
  }, [getAttributeSetList, getCategoryList]);

  const loadClaimPolicies = async () => {
    const result = await getClaimPolicyList({
      page: 1,
      limit: 200,
      isActive: "true",
    });
    if (result?.status) {
      setClaimPolicyOptions(
        (result.data || []).map((row) => ({
          value: row._id,
          label: `${row.name} (${row.code})${row.isActive ? "" : " [Inactive]"}`,
        })),
      );
    }
  };

  useEffect(() => {
    loadClaimPolicies();
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoadingProduct(true);
      const result = await getProductById(id);
      if (result?.status && result?.data) {
        const categoryIds = Array.isArray(result.data.categoryIds)
          ? result.data.categoryIds.map((item) => String(item?._id || item))
          : [];
        const primaryCategoryId = String(
          result.data.primaryCategoryId?._id || "",
        );
        if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
          categoryIds.push(primaryCategoryId);
        }
        setFormData({
          name: result.data.name || "",
          slug: result.data.slug || "",
          primaryCategoryId,
          categoryIds,
          attributeSetId: result.data.attributeSetId?._id || "",
          attributes:
            result.data.attributes && typeof result.data.attributes === "object"
              ? result.data.attributes
              : {},
          description: result.data.description || "",
          deliveryDescription: result.data.deliveryDescription || "",
          purchaseNote: result.data.purchaseNote || "",
          seo: {
            metaTitle: result.data?.seo?.metaTitle || "",
            metaDescription: result.data?.seo?.metaDescription || "",
            metaKeywords: Array.isArray(result.data?.seo?.metaKeywords)
              ? result.data.seo.metaKeywords
              : [],
          },
          searchKeywords: Array.isArray(result.data.searchKeywords)
            ? result.data.searchKeywords
            : [],
          status: result.data.status || 1,
          claimsEnabled: Boolean(result.data.claimPolicyId?._id || result.data.claimPolicyId),
          claimPolicyId:
            result.data.claimPolicyId?._id || result.data.claimPolicyId || "",
          sizeChart: normalizeIncomingSizeChart(result.data.sizeChart),
        });
        setSearchKeywordsInput(
          Array.isArray(result.data.searchKeywords)
            ? result.data.searchKeywords.join(", ")
            : "",
        );
        setSeoKeywordsInput(
          Array.isArray(result.data?.seo?.metaKeywords)
            ? result.data.seo.metaKeywords.join(", ")
            : "",
        );
      } else {
        navigate("/admin/products");
      }
      setLoadingProduct(false);
      setFieldTouched({});
      setSubmitAttempted(false);
    };
    run();
  }, [getProductById, id, navigate]);

  useEffect(() => {
    const loadAttributes = async () => {
      if (!formData.attributeSetId) return;
      await getAttributeList({
        limit: 100,
        page: 1,
        orderBy: "name",
        ascending: "asc",
        filters: "attributeSetId,isActive",
        query: JSON.stringify({
          attributeSetId: { value: formData.attributeSetId, type: "id" },
          isActive: { value: true, type: "Boolean" },
        }),
      });
    };
    loadAttributes();
  }, [formData.attributeSetId, getAttributeList]);

  const onInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: generateSlug(value),
      }));
      return;
    }

    if (name === "categoryIds") {
      setFormData((prev) => ({ ...prev, categoryIds: value || [] }));
      return;
    }

    if (name === "attributeSetId") {
      setFormData((prev) => ({
        ...prev,
        attributeSetId: value,
        attributes: {},
      }));
      return;
    }

    if (name === "claimsEnabled") {
      setFormData((prev) => ({
        ...prev,
        claimsEnabled: Boolean(value),
        claimPolicyId: value ? prev.claimPolicyId : "",
      }));
      return;
    }

    if (name.startsWith("seo.")) {
      const seoKey = name.replace("seo.", "");
      setFormData((prev) => ({
        ...prev,
        seo: {
          ...(prev.seo || {}),
          [seoKey]: value,
        },
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onAttributeChange = (code, value) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [code]: value,
      },
    }));
  };

  const onSizeChartChange = (nextChart) => {
    setFormData((prev) => ({
      ...prev,
      sizeChart:
        nextChart && typeof nextChart === "object"
          ? {
              sizes: Array.isArray(nextChart.sizes) ? nextChart.sizes : [],
              rows: Array.isArray(nextChart.rows) ? nextChart.rows : [],
            }
          : { sizes: [], rows: [] },
    }));
  };

  const onSearchKeywordsChange = (e) => {
    const input = e.target.value || "";
    setSearchKeywordsInput(input);
    const normalizedKeywords = input
      .split(",")
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      searchKeywords: [...new Set(normalizedKeywords)],
    }));
  };

  const onSeoKeywordsChange = (e) => {
    const input = e.target.value || "";
    setSeoKeywordsInput(input);
    const normalizedKeywords = input
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      seo: {
        ...(prev.seo || {}),
        metaKeywords: [...new Set(normalizedKeywords)],
      },
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = [];

    if (!formData.name.trim()) {
      errors.push({ path: "name", msg: "Please enter product name." });
    }
    if (!formData.slug.trim()) {
      errors.push({ path: "slug", msg: "Please enter product slug." });
    }
    if (!formData.primaryCategoryId) {
      errors.push({
        path: "primaryCategoryId",
        msg: "Please select primary category.",
      });
    }
    if (!formData.attributeSetId) {
      errors.push({
        path: "attributeSetId",
        msg: "Please select attribute set.",
      });
    }
    if (formData.claimsEnabled && !formData.claimPolicyId) {
      errors.push({
        path: "claimPolicyId",
        msg: "Please select claim policy.",
      });
    }

    if (errors.length) {
      setSubmitAttempted(true);
      setErrors(errors);
      return;
    }

    const categoryIds = Array.isArray(formData.categoryIds)
      ? formData.categoryIds.filter(Boolean)
      : [];
    if (!categoryIds.includes(formData.primaryCategoryId)) {
      categoryIds.push(formData.primaryCategoryId);
    }

    const payload = new FormData();
    payload.append("name", formData.name.trim());
    payload.append("slug", formData.slug.trim());
    payload.append("primaryCategoryId", formData.primaryCategoryId);
    payload.append("categoryIds", JSON.stringify(categoryIds));
    payload.append("attributeSetId", formData.attributeSetId);
    payload.append("attributes", JSON.stringify(formData.attributes || {}));
    payload.append("description", formData.description || "");
    payload.append("deliveryDescription", formData.deliveryDescription || "");
    payload.append("purchaseNote", formData.purchaseNote || "");
    payload.append("seo", JSON.stringify(formData.seo || {}));
    payload.append(
      "searchKeywords",
      JSON.stringify(formData.searchKeywords || []),
    );
    payload.append("status", String(Number(formData.status) || 1));
    payload.append("claimPolicyId", formData.claimsEnabled ? formData.claimPolicyId : "");
    payload.append(
      "sizeChart",
      JSON.stringify(
        formData.sizeChart && typeof formData.sizeChart === "object"
          ? {
              sizes: Array.isArray(formData.sizeChart.sizes)
                ? formData.sizeChart.sizes
                : [],
              rows: Array.isArray(formData.sizeChart.rows)
                ? formData.sizeChart.rows
                : [],
            }
          : { sizes: [], rows: [] },
      ),
    );

    const result = await updateProduct(id, payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/products");
    }
  };

  const categoryOptions = useMemo(
    () =>
      (categoryList || []).map((item) => ({
        value: item._id,
        label: item.name,
      })),
    [categoryList],
  );
  const attributeSetOptions = useMemo(
    () =>
      (attributeSetList || []).map((item) => ({
        value: item._id,
        label: item.name,
      })),
    [attributeSetList],
  );
  const attributeDefinitions = useMemo(
    () => attributeList || [],
    [attributeList],
  );
  if (loadingProduct) return <BouncingLoader minHeight="360px" />;

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Products", link: "/admin/products" },
          { label: "Edit Product" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Edit Product</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <ProductForm
              formData={formData}
              onInputChange={onInputChange}
              onAttributeChange={onAttributeChange}
              onFieldBlur={markFieldTouched}
              searchKeywordsInput={searchKeywordsInput}
              onSearchKeywordsChange={onSearchKeywordsChange}
              seoKeywordsInput={seoKeywordsInput}
              onSeoKeywordsChange={onSeoKeywordsChange}
              localErrors={visibleLocalErrors}
              primaryCategoryOptions={categoryOptions}
              categoryOptions={categoryOptions}
              attributeSetOptions={attributeSetOptions}
              claimPolicyOptions={claimPolicyOptions}
              attributeDefinitions={attributeDefinitions}
              onSizeChartChange={onSizeChartChange}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/admin/products")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loadingSubmit || !isFormValid}
              >
                {loadingSubmit ? "Saving..." : "Update Product"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  productStore: state.product,
  categoryStore: state.category,
  attributeSetStore: state.attributeSet,
  attributeStore: state.attribute,
});

export default connect(mapStateToProps, {
  getProductById,
  updateProduct,
  getClaimPolicyList,
  getCategoryList,
  getAttributeSetList,
  getAttributeList,
  setErrors,
  removeErrors,
})(ProductEdit);
