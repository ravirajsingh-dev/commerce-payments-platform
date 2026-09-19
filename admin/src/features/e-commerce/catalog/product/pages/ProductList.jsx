import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import {
  deleteProduct,
  getProductList,
} from "@src/features/e-commerce/catalog/product/productActions";
import { getCategoryList } from "@src/features/e-commerce/catalog/category/categoryActions";
import ProductFilters from "@src/features/e-commerce/catalog/product/components/ProductFilters";
import ProductTable from "@src/features/e-commerce/catalog/product/components/ProductTable";

const ProductList = ({
  productStore,
  categoryStore,
  getProductList,
  deleteProduct,
  getCategoryList,
}) => {
  const navigate = useNavigate();
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    primaryCategoryId: "",
    status: "",
  });
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { products, totalRecord, summary, loadingList, loadingSubmit } = productStore;
  const { categories } = categoryStore;

  useEffect(() => {
    getProductList(params);
  }, [getProductList, params]);

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
    setCategoryOptions((categories || []).map((item) => ({
      value: item._id,
      label: item.name,
    })));
  }, [categories]);

  const applyFilters = (nextFiltersData) => {
    const nextQuery = {};
    const nextFilters = [];

    const name = String(nextFiltersData.name || "").trim();
    const primaryCategoryId = String(
      nextFiltersData.primaryCategoryId || "",
    ).trim();
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
    if (name === "status") {
      const nextStatus = value === "" ? null : Number(value);
      setSelectedSummaryStatus([1, 2, 3].includes(nextStatus) ? nextStatus : null);
    }
  };

  const onSearch = () => {
    const nextStatus =
      filters.status === "" || filters.status === null
        ? null
        : Number(filters.status);
    setSelectedSummaryStatus([1, 2, 3].includes(nextStatus) ? nextStatus : null);
    applyFilters(filters);
  };

  const onResetFilters = () => {
    const resetState = {
      name: "",
      primaryCategoryId: "",
      status: "",
    };
    setSelectedSummaryStatus(null);
    setFilters(resetState);
    applyFilters(resetState);
  };

  const onSummaryCardClick = (statusValue) => {
    setSelectedSummaryStatus(statusValue);
    const nextFiltersData = {
      ...filters,
      status: statusValue === null ? "" : statusValue,
    };
    setFilters(nextFiltersData);
    applyFilters(nextFiltersData);
  };

  const handleOpenCreate = () => {
    navigate("/admin/products/create");
  };

  const handleOpenEdit = (product) => {
    navigate(`/admin/products/edit/${product._id}`);
  };

  const handleOpenDelete = (product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setSelectedProduct(null);
  };

  const onConfirmDelete = async () => {
    if (!selectedProduct?._id) return;
    const result = await deleteProduct(selectedProduct._id);
    if (result?.status) {
      handleCloseDelete();
      await getProductList(params);
    }
  };

  const summaryItems = useMemo(
    () => [
      {
        label: "Total",
        value: totalRecord,
        active: selectedSummaryStatus === null,
        onClick: () => onSummaryCardClick(null),
      },
      {
        label: "Active",
        value: summary?.active || 0,
        active: selectedSummaryStatus === 1,
        onClick: () => onSummaryCardClick(1),
      },
      {
        label: "Draft",
        value: summary?.draft || 0,
        active: selectedSummaryStatus === 2,
        onClick: () => onSummaryCardClick(2),
      },
      {
        label: "Inactive",
        value: summary?.inactive || 0,
        active: selectedSummaryStatus === 3,
        onClick: () => onSummaryCardClick(3),
      },
    ],
    [totalRecord, summary, selectedSummaryStatus],
  );

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Products" },
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
          disabled={loadingSubmit}
        >
          Create Product
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

      <SummaryStatsCards items={summaryItems} />

      <ProductTable
        data={products}
        count={totalRecord}
        loadingList={loadingList}
        params={params}
        setParams={setParams}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      <AdvancedModal
        show={showDeleteModal}
        onHide={handleCloseDelete}
        title="Delete Product"
        size="sm"
        actions={[
          {
            label: "Close",
            onClick: handleCloseDelete,
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: loadingSubmit ? "Deleting..." : "Delete",
            onClick: onConfirmDelete,
            className: "btn btn--danger",
            disabled: loadingSubmit,
            colSize: 7,
          },
        ]}
      >
        <p className="mb-0">
          Are you sure you want to delete{" "}
          <strong>{selectedProduct?.name || "this product"}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  productStore: state.product,
  categoryStore: state.category,
});

export default connect(mapStateToProps, {
  getProductList,
  deleteProduct,
  getCategoryList,
})(ProductList);
