const {
  INVOICE_DOWNLOAD_ELIGIBLE_ORDER_STATUSES,
} = require("../../../../shared/constants/order");

const INVOICE_DOWNLOAD_ELIGIBLE_STATUSES = new Set(
  INVOICE_DOWNLOAD_ELIGIBLE_ORDER_STATUSES,
);

const canDownloadOrderInvoice = (status) =>
  INVOICE_DOWNLOAD_ELIGIBLE_STATUSES.has(
    String(status || "")
      .trim()
      .toLowerCase(),
  );

module.exports = {
  INVOICE_DOWNLOAD_ELIGIBLE_STATUSES,
  canDownloadOrderInvoice,
};
