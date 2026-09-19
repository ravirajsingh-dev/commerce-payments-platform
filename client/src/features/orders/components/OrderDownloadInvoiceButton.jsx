import { useState } from "react";
import PropTypes from "prop-types";
import { FaFilePdf } from "react-icons/fa";
import { connect } from "react-redux";

import { downloadOrderInvoice } from "@src/features/orders/orderActions";
import { setAlert } from "@src/app/state/actions/alert";

const OrderDownloadInvoiceButton = ({
  orderNo,
  canDownloadInvoice = false,
  className = "",
  size = "sm",
  setAlert,
  downloadOrderInvoice,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!orderNo || loading || !canDownloadInvoice) return;

    setLoading(true);
    try {
      const { blob, fileName } = await downloadOrderInvoice(orderNo);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err.status === 403
          ? err.message || "Invoice is available after your order is delivered."
          : err.message || "Unable to download invoice.";
      setAlert(message, err.status === 403 ? "warning" : "danger");
    } finally {
      setLoading(false);
    }
  };

  const classes = [
    "btn",
    "btn--outline",
    size === "sm" ? "btn-sm" : "",
    "order-download-invoice-btn",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="order-download-invoice">
      <button
        type="button"
        className={classes}
        onClick={handleClick}
        disabled={loading || !canDownloadInvoice}
        aria-busy={loading}
        aria-disabled={!canDownloadInvoice}
      >
        <FaFilePdf aria-hidden />
        {loading ? "Preparing…" : "Download invoice"}
      </button>
      {!canDownloadInvoice ? (
        <p className="order-download-invoice__hint">
          Invoice is available once your order is delivered.
        </p>
      ) : null}
    </div>
  );
};

OrderDownloadInvoiceButton.propTypes = {
  orderNo: PropTypes.string.isRequired,
  canDownloadInvoice: PropTypes.bool,
  className: PropTypes.string,
  size: PropTypes.oneOf(["sm", "md"]),
  setAlert: PropTypes.func.isRequired,
};

export default connect(null, { setAlert, downloadOrderInvoice })(
  OrderDownloadInvoiceButton,
);
