import { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import LowStockFilters from "../components/LowStockFilters";
import { fetchLowStock } from "../inventoryActions";
import {
  STOCK_LEVEL_FILTER,
  buildLowStockSummary,
  filterLowStockItems,
  paginateRows,
  sortInventoryRows,
} from "../inventoryHelpers";

const EMPTY_FILTERS = {
  sku: "",
  productName: "",
  stockLevel: "",
  includeInactive: false,
};

const LowStockList = ({ fetchLowStock }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedSummaryKey, setSelectedSummaryKey] = useState(null);
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "stock", ascending: "asc" }),
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    const res = await fetchLowStock({
      includeInactive: appliedFilters.includeInactive,
      syncNotifications: true,
    });
    if (res?.status) {
      setThreshold(res.data.threshold ?? null);
      setAllItems(res.data.items || []);
    } else {
      setAllItems([]);
    }
    setLoading(false);
  }, [fetchLowStock, appliedFilters.includeInactive]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    let rows = filterLowStockItems(allItems, appliedFilters);
    if (selectedSummaryKey === "out") {
      rows = rows.filter((row) => (Number(row.stock) || 0) === 0);
    } else if (selectedSummaryKey === "low") {
      rows = rows.filter((row) => {
        const stock = Number(row.stock) || 0;
        return stock > 0;
      });
    }
    return rows;
  }, [allItems, appliedFilters, selectedSummaryKey]);

  const sortedItems = useMemo(
    () => sortInventoryRows(filteredItems, params.orderBy, params.ascending),
    [filteredItems, params.orderBy, params.ascending],
  );

  const tableRows = useMemo(
    () => paginateRows(sortedItems, params.page, params.limit),
    [sortedItems, params.page, params.limit],
  );

  const summary = useMemo(
    () => buildLowStockSummary(allItems, threshold),
    [allItems, threshold],
  );

  const onFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;
    setFilters((prev) => ({ ...prev, [name]: nextValue }));
    if (name === "stockLevel") {
      setSelectedSummaryKey(null);
    }
  };

  const onSearch = () => {
    setAppliedFilters(filters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSelectedSummaryKey(null);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onSummaryCardClick = (key) => {
    setSelectedSummaryKey(key);
    const nextFilters = { ...appliedFilters, stockLevel: "" };
    if (key === "out") {
      nextFilters.stockLevel = STOCK_LEVEL_FILTER.OUT;
    } else if (key === "low") {
      nextFilters.stockLevel = STOCK_LEVEL_FILTER.LOW;
    }
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const columns = useMemo(
    () => [
      {
        name: "SKU",
        selector: (row) => row.sku,
        sortable: true,
        sortField: "sku",
        minWidth: "130px",
      },
      {
        name: "Product",
        selector: (row) => row.productName,
        sortable: true,
        sortField: "productName",
        minWidth: "200px",
        grow: 2,
        cell: (row) => (
          <div className="admin-inventory-product-cell">
            <span>{row.productName || "—"}</span>
            {row.variantName ? (
              <small>{row.variantName}</small>
            ) : null}
          </div>
        ),
      },
      {
        name: "Size",
        selector: (row) => row.sizeLabel || row.size || "—",
        sortable: true,
        sortField: "size",
        minWidth: "90px",
      },
      {
        name: "Stock",
        selector: (row) => row.stock,
        sortable: true,
        sortField: "stock",
        minWidth: "100px",
        cell: (row) => (
          <span
            className={`badge admin-inventory-stock-badge admin-inventory-stock-badge--${
              row.stock === 0 ? "out" : "low"
            }`}
          >
            {row.stock}
          </span>
        ),
      },
      {
        name: "Threshold",
        selector: (row) => row.threshold,
        minWidth: "110px",
      },
      {
        name: "Actions",
        minWidth: "120px",
        cell: (row) => (
          <Button
            type="button"
            className="btn btn--outline btn-sm"
            onClick={() =>
              navigate(`/admin/product-variants/edit/${row.variantId}`)
            }
          >
            Edit SKU
          </Button>
        ),
      },
    ],
    [navigate],
  );

  const summaryItems = useMemo(
    () => [
      {
        label: "All low stock",
        value: summary.total,
        active: selectedSummaryKey === null,
        onClick: () => onSummaryCardClick(null),
      },
      {
        label: "Out of stock",
        value: summary.outOfStock,
        active: selectedSummaryKey === "out",
        onClick: () => onSummaryCardClick("out"),
      },
      {
        label: "In stock (low)",
        value: summary.inStockLow,
        active: selectedSummaryKey === "low",
        onClick: () => onSummaryCardClick("low"),
      },
      {
        label: "Threshold",
        value: summary.threshold,
      },
    ],
    [summary, selectedSummaryKey],
  );

  return (
    <Container className="admin-inventory-page">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Low stock" },
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
          className="btn btn--outline"
          onClick={loadItems}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <LowStockFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <SummaryStatsCards items={summaryItems} col={{ xs: 6, sm: 6, md: 3 }} />

      <p className="admin-inventory-page__hint text-muted">
        Showing SKUs at or below the configured threshold
        {threshold !== null ? ` (${threshold})` : ""}.
      </p>

      <Card className="common-panel-card">
        <Card.Body>
          <CustomDataTable
            columns={columns}
            data={tableRows}
            progressPending={loading}
            count={sortedItems.length}
            params={params}
            setParams={setParams}
            sortServer
            minHeight="500px"
            persistTableHead
            noDataComponent={
              <NoRecordsFound description="No SKUs match your filters." />
            }
          />
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = () => ({});

export default connect(mapStateToProps, { fetchLowStock })(LowStockList);
