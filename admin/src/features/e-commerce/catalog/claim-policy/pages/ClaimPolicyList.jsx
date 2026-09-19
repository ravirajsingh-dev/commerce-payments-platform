import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import {
  deleteClaimPolicy,
  getClaimPolicyList,
  setClaimPolicyStatus,
} from "../claimPolicyActions";
import ClaimPolicyFilters from "../components/ClaimPolicyFilters";
import ClaimPolicyTable from "../components/ClaimPolicyTable";

const ClaimPolicyList = ({ getClaimPolicyList, setClaimPolicyStatus, deleteClaimPolicy }) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ search: "", isActive: "" });
  const [appliedFilters, setAppliedFilters] = useState({ search: "", isActive: "" });
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "updatedAt", ascending: "desc" }),
  );
  const [rows, setRows] = useState([]);
  const [totalRecord, setTotalRecord] = useState(0);
  const [summary, setSummary] = useState({ active: 0, inactive: 0 });
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const listParams = useMemo(() => {
    const next = {
      page: params.page || 1,
      limit: params.limit || 20,
    };
    if (appliedFilters.search) next.search = appliedFilters.search;
    if (appliedFilters.isActive) next.isActive = appliedFilters.isActive;
    return next;
  }, [params, appliedFilters]);

  const loadRows = async () => {
    setLoadingList(true);
    const result = await getClaimPolicyList(listParams);
    if (result?.status) {
      setRows(result.data || []);
      setTotalRecord(Number(result.pagination?.total || 0));
      setSummary(result.summary || { active: 0, inactive: 0 });
    }
    setLoadingList(false);
  };

  useEffect(() => {
    loadRows();
  }, [listParams]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onSearch = () => {
    setAppliedFilters(filters);
    setParams((prev) => ({ ...prev, page: 1 }));
    if (filters.isActive === "") setSelectedSummaryStatus(null);
    if (filters.isActive === "true") setSelectedSummaryStatus(true);
    if (filters.isActive === "false") setSelectedSummaryStatus(false);
  };

  const onResetFilters = () => {
    const empty = { search: "", isActive: "" };
    setFilters(empty);
    setAppliedFilters(empty);
    setSelectedSummaryStatus(null);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onSummaryCardClick = (statusValue) => {
    setSelectedSummaryStatus(statusValue);
    const nextFilters = {
      search: "",
      isActive: statusValue === null ? "" : String(statusValue),
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onConfirmStatus = async () => {
    if (!statusTarget?._id) return;
    setLoadingSubmit(true);
    const result = await setClaimPolicyStatus(statusTarget._id, !statusTarget.isActive);
    setLoadingSubmit(false);
    if (result?.status) {
      setStatusTarget(null);
      await loadRows();
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setLoadingSubmit(true);
    const result = await deleteClaimPolicy(deleteTarget._id);
    setLoadingSubmit(false);
    if (result?.status) {
      setDeleteTarget(null);
      await loadRows();
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
          { label: "Claim Policies" },
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
          onClick={() => navigate("/admin/claim-policies/create")}
        >
          Create Claim Policy
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <ClaimPolicyFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <SummaryStatsCards items={summaryItems} />

      <ClaimPolicyTable
        data={rows}
        count={totalRecord}
        loadingList={loadingList}
        params={params}
        setParams={setParams}
        onEdit={(row) => navigate(`/admin/claim-policies/edit/${row._id}`)}
        onToggle={setStatusTarget}
        onDelete={setDeleteTarget}
      />

      <AdvancedModal
        closeButton
        show={Boolean(statusTarget)}
        onHide={() => setStatusTarget(null)}
        title={statusTarget?.isActive ? "Deactivate claim policy" : "Activate claim policy"}
        size="sm"
        actions={[
          {
            label: "Close",
            onClick: () => setStatusTarget(null),
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: loadingSubmit
              ? "Updating..."
              : statusTarget?.isActive
                ? "Deactivate"
                : "Activate",
            onClick: onConfirmStatus,
            className: statusTarget?.isActive ? "btn btn--danger" : "btn btn--theme",
            disabled: loadingSubmit,
            colSize: 7,
          },
        ]}
      >
        <p className="mb-0">
          {statusTarget?.isActive ? "Deactivate" : "Activate"}{" "}
          <strong>{statusTarget?.name || "this policy"}</strong>?
        </p>
      </AdvancedModal>
      <AdvancedModal
        closeButton
        show={Boolean(deleteTarget)}
        onHide={() => setDeleteTarget(null)}
        title="Delete claim policy"
        size="sm"
        actions={[
          {
            label: "Close",
            onClick: () => setDeleteTarget(null),
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
          Are you sure you want to hard delete{" "}
          <strong>{deleteTarget?.name || "this policy"}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

export default connect(null, {
  getClaimPolicyList,
  setClaimPolicyStatus,
  deleteClaimPolicy,
})(ClaimPolicyList);
