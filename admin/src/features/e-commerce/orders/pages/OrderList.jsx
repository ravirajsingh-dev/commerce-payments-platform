import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import OrderFilters from "../components/OrderFilters";
import { getOrderList } from "../orderActions";
import {
  formatInr,
  formatOrderDateTime,
  hasPendingCancellationRequest,
  label,
  STATUS_LIST,
} from "../orderHelpers";

const EMPTY_FILTERS = {
  orderNo: "",
  status: "",
  paymentStatus: "",
  userId: "",
  fromDate: "",
  toDate: "",
  pendingCancelRequest: false,
  pendingClaim: false,
};

const OrderList = ({ orderStore, getOrderList }) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);
  const [pendingCancelFilterActive, setPendingCancelFilterActive] = useState(false);
  const [pendingClaimFilterActive, setPendingClaimFilterActive] = useState(false);
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );

  const {
    orders,
    totalRecord,
    summary,
    pendingCancelRequestCount,
    pendingClaimCount,
    loadingList,
  } =
    orderStore;

  const listParams = useMemo(() => {
    const next = {
      page: params.page || 1,
      limit: params.limit || 20,
      orderBy: params.orderBy || "createdAt",
      ascending: params.ascending || "desc",
    };

    const orderNo = String(appliedFilters.orderNo || "").trim();
    const status = String(appliedFilters.status || "").trim();
    const paymentStatus = String(appliedFilters.paymentStatus || "").trim();
    const userId = String(appliedFilters.userId || "").trim();
    const fromDate = String(appliedFilters.fromDate || "").trim();
    const toDate = String(appliedFilters.toDate || "").trim();

    if (orderNo) next.orderNo = orderNo;
    if (status) next.status = status;
    if (paymentStatus) next.paymentStatus = paymentStatus;
    if (userId) next.userId = userId;
    if (fromDate) next.fromDate = fromDate;
    if (toDate) next.toDate = toDate;
    if (appliedFilters.pendingCancelRequest) {
      next.pendingCancelRequest = "true";
    }
    if (appliedFilters.pendingClaim) {
      next.pendingClaim = "true";
    }

    return next;
  }, [params, appliedFilters]);

  useEffect(() => {
    getOrderList(listParams);
  }, [getOrderList, listParams]);

  const onFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSearch = () => {
    setAppliedFilters(filters);
    setPendingCancelFilterActive(Boolean(filters.pendingCancelRequest));
    setPendingClaimFilterActive(Boolean(filters.pendingClaim));
    setSelectedSummaryStatus(String(filters.status || "").trim() || null);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSelectedSummaryStatus(null);
    setPendingCancelFilterActive(false);
    setPendingClaimFilterActive(false);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onSummaryCardClick = (status) => {
    setSelectedSummaryStatus(status);
    setPendingCancelFilterActive(false);
    setPendingClaimFilterActive(false);
    const nextFilters = {
      ...appliedFilters,
      status: status || "",
      pendingCancelRequest: false,
      pendingClaim: false,
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onPendingCancelSummaryClick = () => {
    setSelectedSummaryStatus(null);
    setPendingCancelFilterActive(true);
    setPendingClaimFilterActive(false);
    const nextFilters = {
      ...appliedFilters,
      status: "",
      pendingCancelRequest: true,
      pendingClaim: false,
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onPendingClaimSummaryClick = () => {
    setSelectedSummaryStatus(null);
    setPendingCancelFilterActive(false);
    setPendingClaimFilterActive(true);
    const nextFilters = {
      ...appliedFilters,
      status: "",
      pendingCancelRequest: false,
      pendingClaim: true,
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const columns = useMemo(
    () => [
      {
        name: "Order",
        selector: (row) => row.orderNo,
        sortable: true,
        sortField: "orderNo",
        minWidth: "190px",
        cell: (row) => (
          <button
            type="button"
            className="btn btn-link p-0 text-start admin-order-link"
            onClick={() =>
              navigate(`/admin/orders/${encodeURIComponent(row.orderNo)}`)
            }
          >
            {row.orderNo}
          </button>
        ),
      },
      {
        name: "Customer",
        minWidth: "200px",
        cell: (row) => (
          <div className="admin-order-customer">
            <span>{row.customer?.name || "—"}</span>
            <small>{row.customer?.phone || row.customer?.email || ""}</small>
          </div>
        ),
      },
      {
        name: "Placed",
        selector: (row) => row.createdAt,
        sortable: true,
        sortField: "createdAt",
        minWidth: "180px",
        cell: (row) => formatOrderDateTime(row.createdAt),
      },
      {
        name: "Items",
        selector: (row) => row.itemCount,
        minWidth: "90px",
        cell: (row) => row.itemCount ?? 0,
      },
      {
        name: "Total",
        selector: (row) => row.amounts?.total ?? 0,
        sortable: true,
        sortField: "amounts.total",
        minWidth: "130px",
        cell: (row) => formatInr(row.amounts?.total),
      },
      {
        name: "Status",
        selector: (row) => row.status,
        sortable: true,
        sortField: "status",
        minWidth: "160px",
        cell: (row) => (
          <div className="d-flex flex-column gap-1 align-items-start">
            <span className={`badge admin-order-status admin-order-status--${row.status}`}>
              {label(row.status)}
            </span>
            {hasPendingCancellationRequest(row) ? (
              <span className="badge admin-order-cancel-pending-badge">
                Cancel requested
              </span>
            ) : null}
            {row.claim &&
            ["pending", "approved", "in_transit", "received", "inspecting"].includes(
              row.claim.status,
            ) ? (
              <span className="badge admin-order-claim-pending-badge">
                Claim {row.claim.status.replaceAll("_", " ")}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        name: "Payment",
        minWidth: "120px",
        cell: (row) => (
          <span className="admin-order-payment">
            {row.paymentMethod === "cod" ? "COD" : row.paymentMethod}
            <small>{row.paymentStatus}</small>
          </span>
        ),
      },
      {
        name: "Actions",
        minWidth: "180px",
        cell: (row) => (
          <div className="d-flex flex-wrap gap-2">
            <Button
              type="button"
              className="btn btn--outline btn-sm"
              onClick={() =>
                navigate(`/admin/orders/${encodeURIComponent(row.orderNo)}`)
              }
            >
              View
            </Button>
            <Button
              type="button"
              className="btn btn--theme btn-sm"
              onClick={() =>
                navigate(
                  `/admin/orders/${encodeURIComponent(row.orderNo)}/manage`,
                )
              }
            >
              Tracking
            </Button>
            {row.claim?.status ? (
              <Button
                type="button"
                className="btn btn--outline btn-sm"
                onClick={() =>
                  navigate(
                    `/admin/order-claims/${encodeURIComponent(row.orderNo)}/manage`,
                  )
                }
              >
                Claim
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [navigate],
  );

  const summaryItems = useMemo(
    () => [
      {
        label: "All",
        value: totalRecord,
        active: selectedSummaryStatus === null && !pendingCancelFilterActive,
        onClick: () => onSummaryCardClick(null),
      },
      {
        label: "Pending cancel",
        value: pendingCancelRequestCount,
        active: pendingCancelFilterActive,
        onClick: onPendingCancelSummaryClick,
      },
      {
        label: "Pending claims",
        value: pendingClaimCount,
        active: pendingClaimFilterActive,
        onClick: onPendingClaimSummaryClick,
      },
      ...STATUS_LIST.map((status) => ({
        label: status.label,
        value: summary?.[status.value] || 0,
        active: selectedSummaryStatus === status.value,
        onClick: () => onSummaryCardClick(status.value),
      })),
    ],
    [
      totalRecord,
      summary,
      selectedSummaryStatus,
      pendingCancelRequestCount,
      pendingClaimCount,
      pendingCancelFilterActive,
      pendingClaimFilterActive,
    ],
  );

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Orders" },
        ]}
      />

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        {pendingCancelRequestCount > 0 || pendingClaimCount > 0 ? (
          <div className="d-flex gap-2 flex-wrap">
          <Button
            type="button"
            className={`btn btn-sm ${
              pendingCancelFilterActive ? "btn--theme" : "btn--outline"
            }`}
            onClick={onPendingCancelSummaryClick}
            disabled={pendingCancelRequestCount === 0}
          >
            Pending cancel requests ({pendingCancelRequestCount})
          </Button>
          <Button
            type="button"
            className={`btn btn-sm ${
              pendingClaimFilterActive ? "btn--theme" : "btn--outline"
            }`}
            onClick={onPendingClaimSummaryClick}
            disabled={pendingClaimCount === 0}
          >
            Pending claims ({pendingClaimCount})
          </Button>
          </div>
        ) : null}
      </div>

      <Collapse in={showFilters}>
        <div>
          <OrderFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <SummaryStatsCards items={summaryItems} />

      <Card className="common-panel-card">
        <Card.Body>
          <CustomDataTable
            columns={columns}
            data={orders || []}
            progressPending={loadingList}
            count={totalRecord || 0}
            params={params}
            setParams={setParams}
            minHeight="500px"
            persistTableHead
            noDataComponent={<NoRecordsFound description="No orders found." />}
          />
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  orderStore: state.orders,
});

export default connect(mapStateToProps, { getOrderList })(OrderList);
