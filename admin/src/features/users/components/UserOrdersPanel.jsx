import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Collapse } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import {
  formatInr,
  formatOrderDateTime,
  label,
  STATUS_LIST,
} from "@src/features/e-commerce/orders/orderHelpers";
import { getUserOrders } from "../userActions";
import UserOrderFilters from "./UserOrderFilters";

const EMPTY_FILTERS = {
  orderNo: "",
  status: "",
  paymentStatus: "",
  fromDate: "",
  toDate: "",
};

const UserOrdersPanel = ({ userId, embedded = false, onClose }) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);
  const [orders, setOrders] = useState([]);
  const [totalRecord, setTotalRecord] = useState(0);
  const [summary, setSummary] = useState({});
  const [loadingList, setLoadingList] = useState(false);
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );

  useEffect(() => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSelectedSummaryStatus(null);
    setParams(getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }));
    setShowFilters(false);
  }, [userId]);

  const listParams = useMemo(() => {
    const next = {
      page: params.page || 1,
      limit: params.limit || 10,
    };

    const orderNo = String(appliedFilters.orderNo || "").trim();
    const status = String(appliedFilters.status || "").trim();
    const paymentStatus = String(appliedFilters.paymentStatus || "").trim();
    const fromDate = String(appliedFilters.fromDate || "").trim();
    const toDate = String(appliedFilters.toDate || "").trim();

    if (orderNo) next.orderNo = orderNo;
    if (status) next.status = status;
    if (paymentStatus) next.paymentStatus = paymentStatus;
    if (fromDate) next.fromDate = fromDate;
    if (toDate) next.toDate = toDate;

    return next;
  }, [params, appliedFilters]);

  const loadOrders = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      setTotalRecord(0);
      setSummary({});
      return;
    }

    setLoadingList(true);
    const result = await getUserOrders(userId, listParams);
    if (result?.status) {
      setOrders(result.data?.orders || []);
      setTotalRecord(result.data?.pagination?.total || 0);
      setSummary(result.data?.summary || {});
    }
    setLoadingList(false);
  }, [userId, listParams]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onSearch = () => {
    setAppliedFilters(filters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSelectedSummaryStatus(null);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onSummaryCardClick = (status) => {
    setSelectedSummaryStatus(status);
    const nextFilters = {
      ...appliedFilters,
      status: status || "",
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const handleViewOrder = (orderNo) => {
    if (embedded && onClose) {
      onClose();
    }
    navigate(`/admin/orders/${encodeURIComponent(orderNo)}`);
  };

  const columns = useMemo(
    () => [
      {
        name: "Order",
        selector: (row) => row.orderNo,
        minWidth: "190px",
        cell: (row) => (
          <button
            type="button"
            className="btn btn-link p-0 text-start admin-order-link"
            onClick={() => handleViewOrder(row.orderNo)}
          >
            {row.orderNo}
          </button>
        ),
      },
      {
        name: "Placed",
        selector: (row) => row.createdAt,
        minWidth: "170px",
        cell: (row) => formatOrderDateTime(row.createdAt),
      },
      {
        name: "Items",
        selector: (row) => row.itemCount,
        minWidth: "80px",
        cell: (row) => row.itemCount ?? 0,
      },
      {
        name: "Total",
        selector: (row) => row.amounts?.total ?? 0,
        minWidth: "120px",
        cell: (row) => formatInr(row.amounts?.total),
      },
      {
        name: "Status",
        selector: (row) => row.status,
        minWidth: "120px",
        cell: (row) => (
          <span className={`badge admin-order-status admin-order-status--${row.status}`}>
            {label(row.status)}
          </span>
        ),
      },
      {
        name: "Payment",
        minWidth: "110px",
        cell: (row) => (
          <span className="admin-order-payment">
            {row.paymentMethod === "cod" ? "COD" : row.paymentMethod}
            <small>{row.paymentStatus}</small>
          </span>
        ),
      },
      {
        name: "Actions",
        minWidth: "100px",
        cell: (row) => (
          <Button
            type="button"
            className="btn btn--outline btn-sm"
            onClick={() => handleViewOrder(row.orderNo)}
          >
            View
          </Button>
        ),
      },
    ],
    [embedded, onClose, navigate],
  );

  const summaryItems = useMemo(
    () => [
      {
        label: "All",
        value: totalRecord,
        active: selectedSummaryStatus === null,
        onClick: () => onSummaryCardClick(null),
      },
      ...STATUS_LIST.map((status) => ({
        label: status.label,
        value: summary?.[status.value] || 0,
        active: selectedSummaryStatus === status.value,
        onClick: () => onSummaryCardClick(status.value),
      })),
    ],
    [totalRecord, summary, selectedSummaryStatus],
  );

  if (!userId) return null;

  const filtersToggle = (
    <Button
      type="button"
      className="btn btn--outline btn-sm"
      onClick={() => setShowFilters((prev) => !prev)}
    >
      {showFilters ? "Hide filters" : "Filters"}
    </Button>
  );

  const body = (
    <>
      <Collapse in={showFilters}>
        <div className="mb-3">
          <UserOrderFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <SummaryStatsCards items={summaryItems} />

      <CustomDataTable
        columns={columns}
        data={orders}
        progressPending={loadingList}
        count={totalRecord}
        params={params}
        setParams={setParams}
        minHeight={embedded ? "280px" : "320px"}
        persistTableHead
        noDataComponent={
          <NoRecordsFound description="This customer has no orders yet." compact />
        }
      />
    </>
  );

  if (embedded) {
    return (
      <div className="admin-user-orders admin-user-orders--embedded">
        <div className="admin-user-orders__toolbar">{filtersToggle}</div>
        {body}
      </div>
    );
  }

  return (
    <Card className="common-panel-card admin-user-orders mt-4">
      <Card.Header className="admin-user-orders__header">
        <Card.Title as="h5" className="mb-0">
          Order history
        </Card.Title>
        {filtersToggle}
      </Card.Header>
      <Card.Body>{body}</Card.Body>
    </Card>
  );
};

UserOrdersPanel.propTypes = {
  userId: PropTypes.string,
  embedded: PropTypes.bool,
  onClose: PropTypes.func,
};

export default UserOrdersPanel;
