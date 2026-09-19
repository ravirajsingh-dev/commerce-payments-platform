import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card } from "react-bootstrap";
import PropTypes from "prop-types";
import {
  FaCalendarAlt,
  FaChartLine,
  FaRupeeSign,
  FaShoppingBag,
  FaSyncAlt,
} from "react-icons/fa";

import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import {
  formatInr,
  formatOrderDateTime,
} from "@src/features/e-commerce/orders/orderHelpers";
import { getUserAnalytics } from "../userActions";

import { STATUS_LIST } from "@src/constants/order";

const ORDER_STATUS_ROWS = STATUS_LIST.map(({ value, label }) => ({
  key: value,
  label,
}));

const UserCustomerAnalyticsPanel = ({ userId, embedded = false }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!userId) {
      setAnalytics(null);
      return;
    }
    setLoading(true);
    const result = await getUserAnalytics(userId);
    setAnalytics(result?.status ? result.analytics : null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const statusRows = useMemo(() => {
    const breakdown = analytics?.orderStatusBreakdown;
    const total = analytics?.totalOrders || 0;
    if (!breakdown) return [];

    return ORDER_STATUS_ROWS.map(({ key, label }) => {
      const count = breakdown[key] ?? 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { key, label, count, pct };
    });
  }, [analytics]);

  const refreshButton = (
    <Button
      type="button"
      className="btn btn--outline btn-sm"
      disabled={loading}
      onClick={loadAnalytics}
      title="Refresh analytics"
      aria-label="Refresh analytics"
    >
      <FaSyncAlt className={loading ? "admin-user-analytics__spin" : undefined} />
      <span className="ms-2">Refresh</span>
    </Button>
  );

  const body = (
    <>
      {loading && !analytics ? (
        <BouncingLoader minHeight="160px" />
      ) : !analytics ? (
        <p className="admin-user-analytics__empty text-muted mb-0">
          Unable to load customer analytics.
        </p>
      ) : (
        <>
          {analytics.spentDefinition ? (
            <p className="admin-user-analytics__hint">{analytics.spentDefinition}</p>
          ) : null}

          <div className="admin-user-analytics__hero">
            <div className="admin-user-analytics__hero-card admin-user-analytics__hero-card--spent">
              <span className="admin-user-analytics__hero-icon" aria-hidden>
                <FaRupeeSign />
              </span>
              <div>
                <span className="admin-user-analytics__hero-label">Lifetime spent</span>
                <strong className="admin-user-analytics__hero-value">
                  {formatInr(analytics.totalSpent)}
                </strong>
              </div>
            </div>
            <div className="admin-user-analytics__hero-card admin-user-analytics__hero-card--aov">
              <span className="admin-user-analytics__hero-icon" aria-hidden>
                <FaChartLine />
              </span>
              <div>
                <span className="admin-user-analytics__hero-label">Average order value</span>
                <strong className="admin-user-analytics__hero-value">
                  {formatInr(analytics.aov)}
                </strong>
              </div>
            </div>
          </div>

          <div className="admin-user-analytics__metrics">
            <div className="admin-user-analytics__metric">
              <span className="admin-user-analytics__metric-label">
                Orders (excl. cancelled)
              </span>
              <span className="admin-user-analytics__metric-value">
                {analytics.orderCount ?? 0}
              </span>
            </div>
            <div className="admin-user-analytics__metric">
              <span className="admin-user-analytics__metric-label">Total orders placed</span>
              <span className="admin-user-analytics__metric-value">
                {analytics.totalOrders ?? 0}
              </span>
            </div>
            <div className="admin-user-analytics__metric">
              <span className="admin-user-analytics__metric-label">Cancelled orders</span>
              <span className="admin-user-analytics__metric-value">
                {analytics.cancelledOrders ?? analytics.orderStatusBreakdown?.cancelled ?? 0}
              </span>
            </div>
          </div>

          <section className="admin-user-analytics__section" aria-labelledby="analytics-timeline">
            <h6 id="analytics-timeline" className="admin-user-analytics__section-title">
              <FaCalendarAlt aria-hidden />
              Order timeline
            </h6>
            <div className="admin-user-analytics__dates">
              <div className="admin-user-analytics__date-card">
                <span className="admin-user-analytics__date-label">First order</span>
                <span className="admin-user-analytics__date-value">
                  {formatOrderDateTime(analytics.firstOrderAt)}
                </span>
              </div>
              <div className="admin-user-analytics__date-card">
                <span className="admin-user-analytics__date-label">Last order</span>
                <span className="admin-user-analytics__date-value">
                  {formatOrderDateTime(analytics.lastOrderAt)}
                </span>
              </div>
            </div>
          </section>

          {statusRows.length > 0 ? (
            <section
              className="admin-user-analytics__section"
              aria-labelledby="analytics-status"
            >
              <h6 id="analytics-status" className="admin-user-analytics__section-title">
                <FaShoppingBag aria-hidden />
                Orders by status
              </h6>
              <ul className="admin-user-analytics__status-list">
                {statusRows.map((row) => (
                  <li key={row.key} className="admin-user-analytics__status-row">
                    <div className="admin-user-analytics__status-head">
                      <span
                        className={`admin-user-analytics__status-badge admin-order-status admin-order-status--${row.key}`}
                      >
                        {row.label}
                      </span>
                      <span className="admin-user-analytics__status-count">
                        {row.count}
                        <span className="admin-user-analytics__status-pct">({row.pct}%)</span>
                      </span>
                    </div>
                    <div
                      className="admin-user-analytics__status-bar"
                      role="presentation"
                      aria-hidden
                    >
                      <span
                        className={`admin-user-analytics__status-fill admin-user-analytics__status-fill--${row.key}`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );

  if (!userId) return null;

  if (embedded) {
    return (
      <div className="admin-user-analytics admin-user-analytics--embedded">
        <div className="admin-user-analytics__toolbar">{refreshButton}</div>
        {body}
      </div>
    );
  }

  return (
    <Card className="common-panel-card mb-3 admin-user-analytics">
      <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span>Customer analytics</span>
        {refreshButton}
      </Card.Header>
      <Card.Body>{body}</Card.Body>
    </Card>
  );
};

UserCustomerAnalyticsPanel.propTypes = {
  userId: PropTypes.string.isRequired,
  embedded: PropTypes.bool,
};

export default UserCustomerAnalyticsPanel;
