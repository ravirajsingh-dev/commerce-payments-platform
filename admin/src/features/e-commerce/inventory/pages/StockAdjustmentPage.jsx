import { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { getInitialSortingParams } from "@src/constants";
import StockAdjustmentHistoryFilters from "../components/StockAdjustmentHistoryFilters";
import StockAdjustmentModal from "../components/StockAdjustmentModal";
import { fetchStockAdjustmentReasons, fetchStockAdjustments } from "../inventoryActions";
import { formatInventoryDateTime } from "../inventoryHelpers";

const EMPTY_FILTERS = {
  sku: "",
  reason: "",
};

const StockAdjustmentPage = ({
  fetchStockAdjustments,
  fetchStockAdjustmentReasons,
}) => {
  const navigate = useNavigate();
  const [historyLoading, setHistoryLoading] = useState(true);
  const [adjustments, setAdjustments] = useState([]);
  const [totalRecord, setTotalRecord] = useState(0);
  const [reasons, setReasons] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );

  useEffect(() => {
    const loadReasons = async () => {
      const res = await fetchStockAdjustmentReasons();
      if (res?.status) {
        setReasons(res.data || []);
      }
    };
    loadReasons();
  }, [fetchStockAdjustmentReasons]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const query = {
      page: params.page || 1,
      limit: params.limit || 20,
    };
    if (appliedFilters.sku) query.sku = appliedFilters.sku;
    if (appliedFilters.reason) query.reason = appliedFilters.reason;

    const res = await fetchStockAdjustments(query);
    if (res?.status) {
      setAdjustments(res.data.adjustments || []);
      setTotalRecord(res.data.pagination?.total || 0);
    } else {
      setAdjustments([]);
      setTotalRecord(0);
    }
    setHistoryLoading(false);
  }, [fetchStockAdjustments, params, appliedFilters]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onSearch = () => {
    setAppliedFilters({
      sku: filters.sku.trim().toUpperCase(),
      reason: filters.reason,
    });
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const columns = useMemo(
    () => [
      {
        name: "When",
        selector: (row) => row.createdAt,
        minWidth: "160px",
        cell: (row) => formatInventoryDateTime(row.createdAt),
      },
      {
        name: "SKU",
        selector: (row) => row.sku,
        minWidth: "130px",
        cell: (row) => (
          <button
            type="button"
            className="btn btn-link p-0 text-start admin-inventory-link"
            onClick={() =>
              navigate(`/admin/product-variants/edit/${row.variantId}`)
            }
          >
            {row.sku}
          </button>
        ),
      },
      {
        name: "Size",
        selector: (row) => row.size || "—",
        minWidth: "80px",
      },
      {
        name: "Change",
        selector: (row) => row.delta,
        minWidth: "100px",
        cell: (row) => (
          <span
            className={`badge admin-inventory-delta-badge admin-inventory-delta-badge--${
              row.delta > 0 ? "up" : "down"
            }`}
          >
            {row.delta > 0 ? `+${row.delta}` : row.delta}
          </span>
        ),
      },
      {
        name: "Before → After",
        minWidth: "130px",
        cell: (row) => `${row.stockBefore} → ${row.stockAfter}`,
      },
      {
        name: "Reason",
        selector: (row) => row.reason,
        minWidth: "140px",
        grow: 1,
      },
      {
        name: "By",
        selector: (row) => row.adminName,
        minWidth: "120px",
      },
    ],
    [navigate],
  );

  return (
    <Container className="admin-inventory-page">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Stock adjustments" },
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
          onClick={() => setShowAdjustModal(true)}
        >
          Adjust stock
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <StockAdjustmentHistoryFilters
            values={filters}
            reasonOptions={reasons}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <Card className="common-panel-card">
        <Card.Body>
          <CustomDataTable
            columns={columns}
            data={adjustments}
            progressPending={historyLoading}
            count={totalRecord}
            params={params}
            setParams={setParams}
            sortServer
            minHeight="500px"
            persistTableHead
            noDataComponent={
              <NoRecordsFound description="No stock adjustments recorded yet." />
            }
          />
        </Card.Body>
      </Card>

      <StockAdjustmentModal
        show={showAdjustModal}
        onHide={() => setShowAdjustModal(false)}
        onAdjusted={loadHistory}
      />
    </Container>
  );
};

export default connect(null, {
  fetchStockAdjustments,
  fetchStockAdjustmentReasons,
})(StockAdjustmentPage);
