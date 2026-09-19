import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import {
  deleteCategory,
  getCategoryList,
} from "@src/features/e-commerce/catalog/category/categoryActions";
import CategoryFilters from "@src/features/e-commerce/catalog/category/components/CategoryFilters";
import CategoryTable from "@src/features/e-commerce/catalog/category/components/CategoryTable";

const CategoryList = ({ categoryStore, getCategoryList, deleteCategory }) => {
  const navigate = useNavigate();
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    parentCategoryId: "",
    status: "",
  });
  const [parentCategoryOptions, setParentCategoryOptions] = useState([]);
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { categories, totalRecord, summary, loadingList, loadingSubmit } =
    categoryStore;

  useEffect(() => {
    getCategoryList(params);
  }, [getCategoryList, params]);

  useEffect(() => {
    if (!Array.isArray(categories) || categories.length === 0) return;
    setParentCategoryOptions((prev) => {
      const existing = new Map(
        (prev || []).map((item) => [String(item.value), item]),
      );
      categories.forEach((item) => {
        if (item?._id && item?.name) {
          existing.set(String(item._id), { value: item._id, label: item.name });
        }
      });
      return Array.from(existing.values());
    });
  }, [categories]);

  const applyFilters = (nextFiltersData) => {
    const nextQuery = {};
    const nextFilters = [];

    const name = String(nextFiltersData.name || "").trim();
    const parentCategoryId = String(
      nextFiltersData.parentCategoryId || "",
    ).trim();
    const statusValue =
      nextFiltersData.status !== "" && nextFiltersData.status !== null
        ? Number(nextFiltersData.status)
        : null;

    if (name) {
      nextFilters.push("name");
      nextQuery.name = { value: name, type: "String" };
    }
    if (parentCategoryId) {
      nextFilters.push("parentCategoryId");
      nextQuery.parentCategoryId = { value: parentCategoryId, type: "id" };
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
      setSelectedSummaryStatus([1, 2].includes(nextStatus) ? nextStatus : null);
    }
  };

  const onSearch = () => {
    const nextStatus =
      filters.status === "" || filters.status === null
        ? null
        : Number(filters.status);
    setSelectedSummaryStatus([1, 2].includes(nextStatus) ? nextStatus : null);
    applyFilters(filters);
  };

  const onResetFilters = () => {
    const resetState = {
      name: "",
      parentCategoryId: "",
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
    navigate("/admin/categories/create");
  };

  const handleOpenEdit = (category) => {
    navigate(`/admin/categories/edit/${category._id}`);
  };

  const handleOpenDelete = (category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setSelectedCategory(null);
  };

  const onConfirmDelete = async () => {
    if (!selectedCategory?._id) return;
    const result = await deleteCategory(selectedCategory._id);
    if (result?.status) {
      handleCloseDelete();
      await getCategoryList(params);
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
        label: "Inactive",
        value: summary?.inactive || 0,
        active: selectedSummaryStatus === 2,
        onClick: () => onSummaryCardClick(2),
      },
    ],
    [totalRecord, summary, selectedSummaryStatus],
  );

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Categories" },
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
          Create Category
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <CategoryFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
            parentCategoryOptions={parentCategoryOptions}
          />
        </div>
      </Collapse>

      <SummaryStatsCards items={summaryItems} />

      <CategoryTable
        data={categories}
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
        title="Delete Category"
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
          <strong>{selectedCategory?.name || "this category"}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  categoryStore: state.category,
});

export default connect(mapStateToProps, {
  getCategoryList,
  deleteCategory,
})(CategoryList);
