const { buildInvoicePdfBuffer } = require("./invoicePdfBuilder");
const { loadInvoiceContext } = require("./invoiceService");
const { canDownloadOrderInvoice } = require("./invoiceEligibility");
const { isValidOrderNoFormat } = require("../orderNumberGenerator");

const INVOICE_DOWNLOAD_ERROR = {
  INVALID_ORDER_NO: "INVALID_ORDER_NO",
  NOT_FOUND: "ORDER_NOT_FOUND",
  NOT_ELIGIBLE: "INVOICE_NOT_ELIGIBLE",
  GENERATION_FAILED: "INVOICE_GENERATION_FAILED",
};

/**
 * Generates invoice PDF in memory (no R2/storage). User downloads directly.
 */
const getUserOrderInvoiceDownload = async (userId, orderNo) => {
  const normalizedOrderNo = String(orderNo || "").trim().toUpperCase();

  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: INVOICE_DOWNLOAD_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const context = await loadInvoiceContext(userId, normalizedOrderNo);
  if (!context.ok) {
    if (context.code === "INVALID_ORDER_NO") {
      return {
        ok: false,
        code: INVOICE_DOWNLOAD_ERROR.INVALID_ORDER_NO,
        message: "Invalid order number",
        errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
        statusCode: 400,
      };
    }
    return {
      ok: false,
      code: INVOICE_DOWNLOAD_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  const { order, items, settings, customer } = context;

  if (!canDownloadOrderInvoice(order.status)) {
    return {
      ok: false,
      code: INVOICE_DOWNLOAD_ERROR.NOT_ELIGIBLE,
      message: "Invoice is not available for this order yet",
      errors: [
        {
          path: "invoice",
          msg: "Invoice is available after your order is delivered.",
        },
      ],
      statusCode: 403,
    };
  }

  try {
    const pdfBuffer = await buildInvoicePdfBuffer({
      order,
      items,
      settings,
      customer,
    });

    const safeOrderNo = normalizedOrderNo.replace(/[^A-Z0-9]/g, "");

    return {
      ok: true,
      orderNo: normalizedOrderNo,
      pdfBuffer,
      fileName: `${safeOrderNo || "invoice"}.pdf`,
      contentType: "application/pdf",
    };
  } catch (err) {
    console.error("invoice generation failed:", normalizedOrderNo, err);
    return {
      ok: false,
      code: INVOICE_DOWNLOAD_ERROR.GENERATION_FAILED,
      message: "Unable to generate invoice",
      errors: [{ path: "invoice", msg: "Unable to generate invoice." }],
      statusCode: 500,
    };
  }
};

module.exports = {
  INVOICE_DOWNLOAD_ERROR,
  getUserOrderInvoiceDownload,
};
