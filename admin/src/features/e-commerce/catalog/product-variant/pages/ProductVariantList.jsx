import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { getInitialSortingParams } from "@src/constants";
import { getCategoryList } from "@src/features/e-commerce/catalog/category/categoryActions";
import ProductFilters from "@src/features/e-commerce/catalog/product/components/ProductFilters";
import {
  getProductVariantsOverview,
} from "@src/features/e-commerce/catalog/product-variant/productVariantActions";
import ProductVariantProductsOverview from "@src/features/e-commerce/catalog/product-variant/components/ProductVariantProductsOverview";

const ProductVariantList = ({
  categoryStore,
  getCategoryList,
  getProductVariantsOverview,
}) => {
  const navigate = useNavigate();
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "name", ascending: "asc" }),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [totalRecord, setTotalRecord] = useState(0);
  const [productOverviewData, setProductOverviewData] = useState([]);
  const [filters, setFilters] = useState({
    name: "",
    primaryCategoryId: "",
    status: "",
  });
  const [categoryOptions, setCategoryOptions] = useState([]);

  const { categories } = categoryStore;

  useEffect(() => {
    const loadOverview = async () => {
      setLoadingCounts(true);
      const res = await getProductVariantsOverview(params);
      setProductOverviewData(res?.status ? res.data?.rows || [] : []);
      setTotalRecord(res?.status ? Number(res.data?.totalRecord || 0) : 0);
      setLoadingCounts(false);
    };
    loadOverview();
  }, [getProductVariantsOverview, params]);

  useEffect(() => {
    const loadCategoryOptions = async () => {
      await getCategoryList({
        limit: 100,
        page: 1,
        orderBy: "name",
        ascending: "asc",
        filters: "status",
        query: JSON.stringify({
          status: { value: 1, type: "Number" },
        }),
      });
    };
    loadCategoryOptions();
  }, [getCategoryList]);

  useEffect(() => {
    if (!Array.isArray(categories) || categories.length === 0) return;
    setCategoryOptions(
      categories.map((item) => ({
        value: item._id,
        label: item.name,
      })),
    );
  }, [categories]);

  const applyFilters = (nextFiltersData) => {
    const nextQuery = {};
    const nextFilters = [];

    const name = String(nextFiltersData.name || "").trim();
    const primaryCategoryId = String(nextFiltersData.primaryCategoryId || "").trim();
    const statusValue =
      nextFiltersData.status !== "" && nextFiltersData.status !== null
        ? Number(nextFiltersData.status)
        : null;

    if (name) {
      nextFilters.push("name");
      nextQuery.name = { value: name, type: "String" };
    }
    if (primaryCategoryId) {
      nextFilters.push("primaryCategoryId");
      nextQuery.primaryCategoryId = { value: primaryCategoryId, type: "id" };
    }
    if (statusValue !== null && !Number.isNaN(statusValue)) {
      nextFilters.push("status");
      nextQuery.status = { value: statusValue, type: "Number" };
    }

    setParams((prev) => ({
      ...prev,
      page: 1,
      filters: nextFilters.join(","),
      query: Object.keys(nextQuery).length ? JSON.stringify(nextQuery) : "",
    }));
  };

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onSearch = () => {
    applyFilters(filters);
  };

  const onResetFilters = () => {
    const resetState = {
      name: "",
      primaryCategoryId: "",
      status: "",
    };
    setFilters(resetState);
    applyFilters(resetState);
  };

  const handleOpenCreate = () => {
    navigate("/admin/product-variants/add");
  };
  const handleAddVariantForProduct = (productId) => {
    if (!productId) {
      handleOpenCreate();
      return;
    }
    navigate(`/admin/product-variants/add?productId=${productId}`);
  };
  const handleViewList = (productId) => {
    if (!productId) return;
    navigate(`/admin/product-variants/view/${productId}`);
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Product Variants" },
        ]}
      />

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        <Button
          type="button"
          className="btn btn--theme"
          onClick={handleOpenCreate}
        >
          Create Variants
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <ProductFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
            categoryOptions={categoryOptions}
          />
        </div>
      </Collapse>

      <ProductVariantProductsOverview
        data={productOverviewData}
        count={totalRecord}
        loading={loadingCounts}
        params={params}
        setParams={setParams}
        onViewList={handleViewList}
        onAddVariant={handleAddVariantForProduct}
      />
    </Container>
  );
};

const mapStateToProps = (state) => ({
  categoryStore: state.category,
});

export default connect(mapStateToProps, {
  getCategoryList,
  getProductVariantsOverview,
})(ProductVariantList);
