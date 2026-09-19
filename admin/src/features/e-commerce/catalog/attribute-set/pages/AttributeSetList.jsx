import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import {
  deleteAttributeSet,
  getAttributeSetList,
} from "@src/features/e-commerce/catalog/attribute-set/attributeSetActions";
import AttributeSetFilters from "@src/features/e-commerce/catalog/attribute-set/components/AttributeSetFilters";
import AttributeSetTable from "@src/features/e-commerce/catalog/attribute-set/components/AttributeSetTable";

const AttributeSetList = ({
  attributeSetStore,
  getAttributeSetList,
  deleteAttributeSet,
}) => {
  const navigate = useNavigate();
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    status: "",
  });
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAttributeSet, setSelectedAttributeSet] = useState(null);

  const { attributeSets, totalRecord, summary, loadingList, loadingSubmit } =
    attributeSetStore;

  useEffect(() => {
    getAttributeSetList(params);
  }, [getAttributeSetList, params]);

  const applyFilters = (nextFiltersData) => {
    const nextQuery = {};
    const nextFilters = [];

    const name = String(nextFiltersData.name || "").trim();
    const statusValue = nextFiltersData.status;

    if (name) {
      nextFilters.push("name");
      nextQuery.name = { value: name, type: "String" };
    }
    if (statusValue !== "" && statusValue !== null && statusValue !== undefined) {
      nextFilters.push("isActive");
      nextQuery.isActive = {
        value: statusValue === true || statusValue === "true",
        type: "Boolean",
      };
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
      if (value === "" || value === null || value === undefined) {
        setSelectedSummaryStatus(null);
      } else {
        setSelectedSummaryStatus(value === true || value === "true");
      }
    }
  };

  const onSearch = () => {
    if (
      filters.status === "" ||
      filters.status === null ||
      filters.status === undefined
    ) {
      setSelectedSummaryStatus(null);
    } else {
      setSelectedSummaryStatus(filters.status === true || filters.status === "true");
    }
    applyFilters(filters);
  };

  const onResetFilters = () => {
    const resetState = {
      name: "",
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
    navigate("/admin/attribute-sets/create");
  };

  const handleOpenEdit = (attributeSet) => {
    navigate(`/admin/attribute-sets/edit/${attributeSet._id}`);
  };

  const handleOpenDelete = (attributeSet) => {
    setSelectedAttributeSet(attributeSet);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setSelectedAttributeSet(null);
  };

  const onConfirmDelete = async () => {
    if (!selectedAttributeSet?._id) return;
    const result = await deleteAttributeSet(selectedAttributeSet._id);
    if (result?.status) {
      handleCloseDelete();
      await getAttributeSetList(params);
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
        active: selectedSummaryStatus === true,
        onClick: () => onSummaryCardClick(true),
      },
      {
        label: "Inactive",
        value: summary?.inactive || 0,
        active: selectedSummaryStatus === false,
        onClick: () => onSummaryCardClick(false),
      },
    ],
    [totalRecord, summary, selectedSummaryStatus],
  );

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Attribute Sets" },
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
          Create Attribute Set
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <AttributeSetFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <SummaryStatsCards items={summaryItems} />

      <AttributeSetTable
        data={attributeSets}
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
        title="Delete Attribute Set"
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
          <strong>{selectedAttributeSet?.name || "this attribute set"}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  attributeSetStore: state.attributeSet,
});

export default connect(mapStateToProps, {
  getAttributeSetList,
  deleteAttributeSet,
})(AttributeSetList);
