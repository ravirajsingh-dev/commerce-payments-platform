import { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import { getAdminClaimsList } from "../../orderActions";
import ClaimRequestFilters from "../components/ClaimRequestFilters";
import ClaimRequestTable from "../components/ClaimRequestTable";
import {
  CLAIM_SUMMARY_STATUSES,
  labelClaimStatus,
} from "../claimRequestHelpers";

const EMPTY_FILTERS = { orderNo: "", status: "", userId: "", fromDate: "", toDate: "" };

const ClaimRequestList = ({ getAdminClaimsList }) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "requestedAt", ascending: "desc" }),
  );
  const [rows, setRows] = useState([]);
  const [totalRecord, setTotalRecord] = useState(0);
  const [summary, setSummary] = useState({});
  const [loadingList, setLoadingList] = useState(false);
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);

  const listParams = useMemo(
    () => ({
      page: params.page || 1,
      limit: params.limit || 20,
      orderBy: params.orderBy || "requestedAt",
      ascending: params.ascending || "desc",
      status: appliedFilters.status || undefined,
      orderNo: appliedFilters.orderNo || undefined,
      userId: appliedFilters.userId || undefined,
      fromDate: appliedFilters.fromDate || undefined,
      toDate: appliedFilters.toDate || undefined,
    }),
    [params, appliedFilters],
  );

  const loadSummary = useCallback(async () => {
    const results = await Promise.all(
      CLAIM_SUMMARY_STATUSES.map((status) =>
        getAdminClaimsList({ page: 1, limit: 1, status }),
      ),
    );
    const nextSummary = {};
    CLAIM_SUMMARY_STATUSES.forEach((status, index) => {
      nextSummary[status] = Number(results[index]?.pagination?.total || 0);
    });
    setSummary(nextSummary);
  }, [getAdminClaimsList]);

  const loadRows = useCallback(async () => {
    setLoadingList(true);
    const result = await getAdminClaimsList(listParams);
    if (result?.status) {
      setRows(result.data || []);
      setTotalRecord(Number(result.pagination?.total || 0));
    }
    setLoadingList(false);
  }, [getAdminClaimsList, listParams]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onSearch = () => {
    setAppliedFilters(filters);
    setParams((prev) => ({ ...prev, page: 1 }));
    if (filters.status === "") setSelectedSummaryStatus(null);
    else setSelectedSummaryStatus(filters.status);
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSelectedSummaryStatus(null);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onSummaryCardClick = (statusValue) => {
    setSelectedSummaryStatus(statusValue);
    const nextFilters = {
      ...EMPTY_FILTERS,
      status: statusValue === null ? "" : statusValue,
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const handleManage = (row) => {
    const orderNo = encodeURIComponent(String(row?.orderNo || "").trim());
    navigate(`/admin/order-claims/${orderNo}/manage`);
  };

  const summaryTotal = useMemo(
    () => CLAIM_SUMMARY_STATUSES.reduce((sum, status) => sum + (summary[status] || 0), 0),
    [summary],
  );

  const summaryItems = useMemo(
    () => [
      {
        label: "Total",
        value: summaryTotal,
        active: selectedSummaryStatus === null && !appliedFilters.orderNo && !appliedFilters.userId,
        onClick: () => onSummaryCardClick(null),
      },
      ...CLAIM_SUMMARY_STATUSES.map((status) => ({
        label: labelClaimStatus(status),
        value: summary[status] || 0,
        active: selectedSummaryStatus === status,
        onClick: () => onSummaryCardClick(status),
      })),
    ],
    [summary, summaryTotal, selectedSummaryStatus, appliedFilters.orderNo, appliedFilters.userId],
  );

  return (
    <Container className="claim-request-page">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Claim Requests" },
        ]}
      />

      <div className="claim-request-page__toolbar d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-2 mb-3">
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
          onClick={() => navigate("/admin/order-claims/create")}
        >
          Raise Claim Request
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <ClaimRequestFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <SummaryStatsCards items={summaryItems} className="claim-request-summary-cards" />

      <ClaimRequestTable
        data={rows}
        count={totalRecord}
        loadingList={loadingList}
        params={params}
        setParams={setParams}
        onManage={handleManage}
      />
    </Container>
  );
};

export default connect(null, { getAdminClaimsList })(ClaimRequestList);
