import { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Col, Collapse, Container, Row } from "react-bootstrap";
import {
  FaChartLine,
  FaRupeeSign,
  FaShoppingBag,
  FaSyncAlt,
} from "react-icons/fa";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import { formatInr } from "@src/features/e-commerce/orders/orderHelpers";
import {
  buildSalesDashboardParams,
  fetchSalesDashboard,
} from "../salesDashboardActions";
import SalesDashboardFilters from "../components/SalesDashboardFilters";
import TopSkusTable from "../components/TopSkusTable";
import TopCustomersTable from "../components/TopCustomersTable";
import GmvByPeriodTable from "../components/GmvByPeriodTable";

import { STATUS_LIST } from "@src/constants/order";

const ORDER_STATUS_ROWS = STATUS_LIST.map(({ value, label }) => ({
  key: value,
  label,
}));

const tableParamsInitial = () =>
  getInitialSortingParams({ limit: 10, page: 1, orderBy: "period", ascending: "desc" });

const SalesDashboardPage = ({ salesDashboardStore, fetchSalesDashboard }) => {
  const { dashboard, loading } = salesDashboardStore;
  const [showFilters, setShowFilters] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [period, setPeriod] = useState("day");
  const [gmvParams, setGmvParams] = useState(tableParamsInitial);
  const [customersParams, setCustomersParams] = useState(() =>
    getInitialSortingParams({ limit: 10, page: 1, orderBy: "rank", ascending: "asc" }),
  );
  const [skusParams, setSkusParams] = useState(() =>
    getInitialSortingParams({ limit: 10, page: 1, orderBy: "rank", ascending: "asc" }),
  );

  const resetTablePages = useCallback(() => {
    setGmvParams((prev) => ({ ...prev, page: 1 }));
    setCustomersParams((prev) => ({ ...prev, page: 1 }));
    setSkusParams((prev) => ({ ...prev, page: 1 }));
  }, []);

  const loadDashboard = useCallback(
    (overrides = {}) => {
      const params = buildSalesDashboardParams({
        fromDate: overrides.fromDate ?? fromDate,
        toDate: overrides.toDate ?? toDate,
        period: overrides.period ?? period,
      });
      fetchSalesDashboard(params);
    },
    [fetchSalesDashboard, fromDate, toDate, period],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleApply = () => {
    resetTablePages();
    loadDashboard();
  };

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setPeriod("day");
    resetTablePages();
    loadDashboard({ fromDate: "", toDate: "", period: "day" });
  };

  const handleRefresh = () => {
    loadDashboard();
  };

  const summaryItems = dashboard
    ? [
        {
          label: dashboard.dateRange?.fromDate ? "GMV (range)" : "GMV (all time)",
          value: formatInr(dashboard.gmv),
        },
        { label: "Average order value", value: formatInr(dashboard.aov) },
        {
          label: "Orders (excl. cancelled)",
          value: dashboard.orderCount ?? 0,
        },
        { label: "Total orders placed", value: dashboard.totalOrders ?? 0 },
      ]
    : [];

  const statusRows = useMemo(() => {
    const breakdown = dashboard?.orderStatusBreakdown;
    const total = dashboard?.totalOrders || 0;
    if (!breakdown) return [];
    return ORDER_STATUS_ROWS.map(({ key, label }) => {
      const count = breakdown[key] ?? 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { key, label, count, pct };
    });
  }, [dashboard]);

  const periodLabel = useMemo(() => {
    if (dashboard?.period === "week") return "Week";
    if (dashboard?.period === "month") return "Month";
    return "Day";
  }, [dashboard?.period]);

  const gmvTitle = `GMV by ${periodLabel.toLowerCase()}`;
  const customersTitle = dashboard?.topCustomersLimit
    ? `Top customers (top ${dashboard.topCustomersLimit})`
    : "Top customers";
  const skusTitle = dashboard?.topLimit
    ? `Top SKUs by revenue (top ${dashboard.topLimit})`
    : "Top SKUs by revenue";

  return (
    <Container className="sales-dashboard">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Sales analytics" },
        ]}
      />

      <div className="sales-dashboard__header">
        <div className="sales-dashboard__header-text">
          <h1 className="sales-dashboard__title">Sales dashboard</h1>
          {dashboard?.gmvDefinition ? (
            <p className="sales-dashboard__hint">{dashboard.gmvDefinition}</p>
          ) : (
            <p className="sales-dashboard__hint">
              Track GMV, order volume, top customers, and best-selling SKUs.
            </p>
          )}
        </div>
        <div className="sales-dashboard__header-actions">
          <Button
            type="button"
            className="btn btn--outline"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            {showFilters ? "Hide filters" : "Show filters"}
          </Button>
          <Button
            type="button"
            className="btn btn--theme"
            disabled={loading}
            onClick={handleRefresh}
            title="Refresh dashboard"
            aria-label="Refresh dashboard"
          >
            <FaSyncAlt
              className={loading ? "sales-dashboard__spin" : undefined}
              aria-hidden
            />
            <span className="ms-2 d-none d-sm-inline">Refresh</span>
          </Button>
        </div>
      </div>

      <Collapse in={showFilters}>
        <div>
          <SalesDashboardFilters
            fromDate={fromDate}
            toDate={toDate}
            period={period}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onPeriodChange={setPeriod}
            onApply={handleApply}
            onReset={handleReset}
            loading={loading}
          />
        </div>
      </Collapse>

      {loading && !dashboard ? (
        <BouncingLoader minHeight="420px" />
      ) : (
        <>
          <section className="sales-dashboard__metrics" aria-label="Key metrics">
            <div className="sales-dashboard__hero">
              <div className="sales-dashboard__hero-card sales-dashboard__hero-card--gmv">
                <span className="sales-dashboard__hero-icon" aria-hidden>
                  <FaRupeeSign />
                </span>
                <div>
                  <span className="sales-dashboard__hero-label">
                    {dashboard?.dateRange?.fromDate ? "GMV (range)" : "GMV (all time)"}
                  </span>
                  <strong className="sales-dashboard__hero-value">
                    {formatInr(dashboard?.gmv)}
                  </strong>
                </div>
              </div>
              <div className="sales-dashboard__hero-card sales-dashboard__hero-card--aov">
                <span className="sales-dashboard__hero-icon" aria-hidden>
                  <FaChartLine />
                </span>
                <div>
                  <span className="sales-dashboard__hero-label">Average order value</span>
                  <strong className="sales-dashboard__hero-value">
                    {formatInr(dashboard?.aov)}
                  </strong>
                </div>
              </div>
            </div>

            <SummaryStatsCards
              items={summaryItems.slice(2)}
              className="sales-dashboard__summary"
              col={{ xs: 12, sm: 6 }}
            />
          </section>

          {statusRows.length > 0 ? (
            <section
              className="sales-dashboard__status-section"
              aria-label="Orders by status"
            >
              <h2 className="sales-dashboard__section-heading">
                <FaShoppingBag aria-hidden />
                Orders by status
              </h2>
              <ul className="sales-dashboard__status-grid">
                {statusRows.map((row) => (
                  <li key={row.key} className="sales-dashboard__status-card">
                    <span
                      className={`sales-dashboard__status-badge admin-order-status admin-order-status--${row.key}`}
                    >
                      {row.label}
                    </span>
                    <strong className="sales-dashboard__status-value">{row.count}</strong>
                    <span className="sales-dashboard__status-pct">{row.pct}% of total</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Row className="g-3 sales-dashboard__tables-row">
            <Col xs={12} xl={6}>
              <div className="sales-dashboard__table-block">
                <h2 className="sales-dashboard__section-heading">{gmvTitle}</h2>
                <GmvByPeriodTable
                  rows={dashboard?.gmvByPeriod || []}
                  periodLabel={periodLabel}
                  params={gmvParams}
                  setParams={setGmvParams}
                  loading={loading}
                />
              </div>
            </Col>
            <Col xs={12} xl={6}>
              <div className="sales-dashboard__table-block">
                <h2 className="sales-dashboard__section-heading">{customersTitle}</h2>
                <TopCustomersTable
                  rows={dashboard?.topCustomers || []}
                  params={customersParams}
                  setParams={setCustomersParams}
                  loading={loading}
                />
              </div>
            </Col>
          </Row>

          <div className="sales-dashboard__table-block sales-dashboard__table-block--full">
            <h2 className="sales-dashboard__section-heading">{skusTitle}</h2>
            <TopSkusTable
              rows={dashboard?.topSkus || []}
              params={skusParams}
              setParams={setSkusParams}
              loading={loading}
            />
          </div>

          {dashboard?.generatedAt ? (
            <p className="sales-dashboard__updated text-muted">
              Last updated: {new Date(dashboard.generatedAt).toLocaleString("en-IN")}
            </p>
          ) : null}
        </>
      )}
    </Container>
  );
};

const mapStateToProps = (state) => ({
  salesDashboardStore: state.salesDashboard,
});

export default connect(mapStateToProps, { fetchSalesDashboard })(
  SalesDashboardPage,
);
