import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button } from "react-bootstrap";
import PropTypes from "prop-types";
import { FaExclamationTriangle } from "react-icons/fa";
import { connect } from "react-redux";

import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import { formatInr } from "@src/features/e-commerce/orders/orderHelpers";
import { clearUserCart, getUserCart } from "../userActions";

const ISSUE_LABELS = {
  UNAVAILABLE: "Unavailable",
  INSUFFICIENT_STOCK: "Low stock",
  PRICE_CHANGED: "Price changed",
};

const formatAttributes = (item) => {
  const parts = [];
  if (item.size) {
    parts.push(`Size: ${item.size}`);
  }
  const attrs = item.variantAttributes || item.attributesSnapshot || {};
  Object.entries(attrs).forEach(([key, value]) => {
    if (!value || key === "size") return;
    parts.push(`${key}: ${value}`);
  });
  return parts.join(" · ");
};

const UserCartPanel = ({ userId, embedded = false, clearUserCart }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [params, setParams] = useState(getInitialSortingParams());

  const loadCart = useCallback(async () => {
    if (!userId) {
      setCart(null);
      return;
    }

    setLoading(true);
    const result = await getUserCart(userId);
    if (result?.status) {
      setCart(result.data?.cart || null);
    } else {
      setCart(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setParams(getInitialSortingParams());
    loadCart();
  }, [userId, loadCart]);

  const handleClearCart = async () => {
    if (!userId) return;
    setClearing(true);
    const result = await clearUserCart(userId);
    setShowClearModal(false);
    if (result?.status) {
      setParams((prev) => ({ ...prev, page: 1 }));
      await loadCart();
    }
    setClearing(false);
  };

  const allItems = cart?.items || [];
  const itemCount = cart?.itemCount || 0;
  const hasItems = itemCount > 0;

  const tableData = useMemo(() => {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const start = (page - 1) * limit;
    return allItems.slice(start, start + limit);
  }, [allItems, params.page, params.limit]);

  const columns = useMemo(
    () => [
      {
        name: "Product",
        selector: (row) => row.variantName || row.productName,
        minWidth: "200px",
        grow: 2,
        wrap: true,
        cell: (row) => {
          const title = row.variantName || row.productName || "Product";
          return (
            <div className="user-cart-panel__product-cell user-cart-panel__cell-wrap">
              <span className="user-cart-panel__product-name">{title}</span>
              {row.variantName && row.productName ? (
                <span className="user-cart-panel__product-parent">
                  {row.productName}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        name: "SKU",
        selector: (row) => row.sku,
        minWidth: "180px",
        grow: 1,
        wrap: true,
        cell: (row) => (
          <span className="user-cart-panel__cell-wrap user-cart-panel__sku">
            {row.sku || "—"}
          </span>
        ),
      },
      {
        name: "Details",
        minWidth: "200px",
        grow: 2,
        wrap: true,
        cell: (row) => (
          <span className="user-cart-panel__cell-wrap user-cart-panel__details">
            {formatAttributes(row) || "—"}
          </span>
        ),
      },
      {
        name: "Qty",
        selector: (row) => row.quantity,
        minWidth: "72px",
        right: true,
        cell: (row) => row.quantity,
      },
      {
        name: "Unit",
        selector: (row) => row.unitPriceSnapshot,
        minWidth: "110px",
        right: true,
        cell: (row) => formatInr(row.unitPriceSnapshot),
      },
      {
        name: "Line",
        selector: (row) => row.lineTotal,
        minWidth: "110px",
        right: true,
        cell: (row) => formatInr(row.lineTotal),
      },
      {
        name: "Status",
        minWidth: "140px",
        cell: (row) => {
          if (!(row.issues || []).length) {
            return (
              <Badge bg="success" className="user-cart-panel__badge">
                OK
              </Badge>
            );
          }
          return (
            <div className="user-cart-panel__issue-badges">
              {row.issues.map((code) => (
                <Badge
                  key={code}
                  bg="warning"
                  text="dark"
                  className="user-cart-panel__badge"
                >
                  {ISSUE_LABELS[code] || code}
                </Badge>
              ))}
            </div>
          );
        },
      },
    ],
    [],
  );

  const summaryItems = useMemo(() => {
    const items = [
      { label: "Line items", value: itemCount },
      { label: "Subtotal (snapshot)", value: formatInr(cart?.subtotal || 0) },
      {
        label: "At current prices",
        value: formatInr(cart?.subtotalAtCurrentPrices || 0),
      },
      {
        label: "Issues",
        value: cart?.hasIssues ? "Review" : "None",
      },
    ];
    if (cart?.couponCode) {
      items.splice(3, 0, { label: "Coupon", value: cart.couponCode });
    }
    return items;
  }, [cart, itemCount]);

  if (!userId) return null;

  if (loading && !cart) {
    return <BouncingLoader minHeight="200px" />;
  }

  const toolbar = (
    <div className="admin-user-cart__toolbar">
      <Button
        type="button"
        className="btn btn--outline btn-sm"
        onClick={loadCart}
        disabled={loading || clearing}
      >
        Refresh
      </Button>
      <Button
        type="button"
        className="btn btn--danger btn-sm"
        onClick={() => setShowClearModal(true)}
        disabled={!hasItems || clearing}
      >
        Clear cart
      </Button>
    </div>
  );

  const body = (
    <>
      <SummaryStatsCards items={summaryItems} col={{ xs: 6, sm: 6, md: 3 }} />

      {cart?.hasIssues ? (
        <p className="user-cart-panel__issues-banner" role="status">
          Some lines have stock, price, or availability issues. The customer may
          need to update their cart before checkout.
        </p>
      ) : null}

      <CustomDataTable
        columns={columns}
        data={tableData}
        progressPending={loading}
        count={allItems.length}
        params={params}
        setParams={setParams}
        minHeight={embedded ? "260px" : "320px"}
        persistTableHead
        noDataComponent={
          <NoRecordsFound description="This customer's cart is empty." compact />
        }
      />
    </>
  );

  return (
    <div className={`admin-user-cart${embedded ? " admin-user-cart--embedded" : ""}`}>
      {embedded ? (
        <>
          {toolbar}
          {body}
        </>
      ) : (
        body
      )}

      <AdvancedModal
        show={showClearModal}
        onHide={() => !clearing && setShowClearModal(false)}
        title="Clear customer cart"
        size="sm"
        closeButton
        icon={<FaExclamationTriangle className="common-modal-icon is-danger" />}
        actions={[
          {
            label: "Cancel",
            onClick: () => setShowClearModal(false),
            className: "btn btn--outline",
            colSize: 5,
            disabled: clearing,
          },
          {
            label: clearing ? "Clearing…" : "Clear cart",
            onClick: handleClearCart,
            className: "btn btn--danger",
            colSize: 7,
            disabled: clearing,
          },
        ]}
      >
        <p className="mb-0">
          Remove all {itemCount} item{itemCount === 1 ? "" : "s"} from this
          customer&apos;s cart? This cannot be undone.
        </p>
      </AdvancedModal>
    </div>
  );
};

UserCartPanel.propTypes = {
  userId: PropTypes.string.isRequired,
  embedded: PropTypes.bool,
  clearUserCart: PropTypes.func.isRequired,
};

UserCartPanel.defaultProps = {
  embedded: false,
};

export default connect(null, { clearUserCart })(UserCartPanel);
