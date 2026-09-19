const PDFDocument = require("pdfkit");

const formatInr = (amount) => {
  const value = Math.max(0, Number(amount) || 0);
  const formatted = value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₹${formatted}`;
};

const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAddressBlock = (snapshot = {}) => {
  const lines = [
    snapshot.fullName,
    snapshot.addressLine1,
    snapshot.addressLine2,
    [snapshot.city, snapshot.state, snapshot.pincode].filter(Boolean).join(", "),
    snapshot.country,
    snapshot.phone ? `Phone: ${snapshot.phone}` : "",
  ];
  return lines.filter((line) => String(line || "").trim());
};

const drawTableHeader = (doc, y) => {
  doc.fillColor("#000000").font("Helvetica-Bold").fontSize(9);
  doc.text("Item", 50, y, { width: 255 });
  doc.text("Qty", 310, y, { width: 35, align: "right" });
  doc.text("Unit", 350, y, { width: 90, align: "right" });
  doc.text("Total", 445, y, { width: 100, align: "right" });
  doc
    .moveTo(50, y + 14)
    .lineTo(545, y + 14)
    .strokeColor("#cccccc")
    .stroke();
};

const buildInvoiceAmounts = (order = {}) => {
  const { items = 0, discount = 0, shipping = 0, gst = 0, total = 0 } = order.amounts || {};
  return { items, discount, gst, shipping, total };
};

const drawTotals = (doc, amounts, startY) => {
  const labelX = 340;
  const valueX = 420;
  const rows = [
    ["Items", amounts.items],
    ...(amounts.discount > 0 ? [["Discount", -amounts.discount]] : []),
    ...(amounts.gst > 0 ? [["GST", amounts.gst]] : []),
    ["Shipping", amounts.shipping],
  ];

  let y = startY;
  doc.fillColor("#000000").font("Helvetica").fontSize(10);
  for (const [label, amount] of rows) {
    doc.text(label, labelX, y, { width: 75, align: "right" });
    doc.text(formatInr(Math.abs(amount)), valueX, y, { width: 125, align: "right" });
    y += 16;
  }

  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Total", labelX, y + 4, { width: 75, align: "right" });
  doc.text(formatInr(amounts.total), valueX, y + 4, { width: 125, align: "right" });
};

const drawLineItemRow = (doc, item, rowY) => {
  const sizeLabel = item.size ? ` (${String(item.size).toUpperCase()})` : "";
  const title = `${item.productNameSnapshot || "Product"}${sizeLabel}`;
  const sku = String(item.skuSnapshot || "").trim();

  doc.fillColor("#000000").font("Helvetica").fontSize(9).text(title, 50, rowY, {
    width: 255,
  });

  let rowBottom = rowY + 12;
  if (sku) {
    doc
      .fillColor("#555555")
      .font("Helvetica")
      .fontSize(7.5)
      .text(sku, 50, rowY + 11, { width: 255 });
    doc.fillColor("#000000");
    rowBottom = rowY + 22;
  }

  doc.font("Helvetica").fontSize(9);
  doc.text(String(item.quantity), 310, rowY, { width: 35, align: "right" });
  doc.text(formatInr(item.unitPriceSnapshot), 350, rowY, { width: 90, align: "right" });
  doc.text(formatInr(item.lineTotal), 445, rowY, { width: 100, align: "right" });

  return rowBottom + 6;
};

/**
 * Builds an order invoice PDF buffer (generated on demand; not stored).
 */
const buildInvoicePdfBuffer = async ({
  order,
  items = [],
  settings = {},
  customer = null,
}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);




    const storeName = String(settings.name || "Rajwada").trim();
    const storeAddress = String(settings.address || "").trim();
    const storeEmail = String(settings.email || "").trim();
    const storePhone = String(settings.contactUs || "").trim();

    doc.font("Helvetica-Bold").fontSize(20).text(storeName, { align: "left" });
    doc.font("Helvetica").fontSize(10);
    if (storeAddress) {
      doc.text(storeAddress);
    }
    if (storeEmail || storePhone) {
      doc.text([storeEmail, storePhone ? `Tel: ${storePhone}` : ""].filter(Boolean).join(" · "));
    }

    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").fontSize(16).text("Tax Invoice", { align: "right" });
    doc.font("Helvetica").fontSize(10);
    doc.text(`Invoice #: ${order.orderNo}`, { align: "right" });
    doc.text(`Order date: ${formatDate(order.createdAt)}`, { align: "right" });
    doc.text(`Status: ${String(order.status || "").toUpperCase()}`, { align: "right" });
    doc.text(
      `Payment: ${String(order.paymentMethod || "cod").toUpperCase()} (${String(order.paymentStatus || "pending")})`,
      { align: "right" },
    );

    doc.moveDown(1.2);
    doc.font("Helvetica-Bold").fontSize(11).text("Bill to");
    doc.font("Helvetica").fontSize(10);
    for (const line of formatAddressBlock(order.addressSnapshot)) {
      doc.text(line);
    }
    if (customer?.email) {
      doc.text(`Email: ${customer.email}`);
    }

    doc.moveDown(1);
    const tableTop = doc.y;
    drawTableHeader(doc, tableTop);

    let rowY = tableTop + 22;
    for (const item of items) {
      if (rowY > 680) {
        doc.addPage();
        rowY = 50;
        drawTableHeader(doc, rowY);
        rowY += 22;
      }
      rowY = drawLineItemRow(doc, item, rowY);
    }

    if (order.couponCode) {
      doc.font("Helvetica").fontSize(9).text(`Coupon: ${order.couponCode}`, 50, rowY + 4);
      rowY += 16;
    }

    const discount = Number(order.amounts?.discount) || 0;
    if (discount > 0) {
      doc.font("Helvetica").fontSize(9).text(
        `Coupon discount: ${formatInr(discount)}`,
        50,
        rowY + 4,
      );
      rowY += 16;
    }

    const amounts = buildInvoiceAmounts(order);
    drawTotals(doc, amounts, Math.max(rowY + 24, 620));

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#666666")
      .text(
        "This is a computer-generated invoice and does not require a signature.",
        50,
        760,
        { align: "center", width: 495 },
      );

    doc.end();
  });
};

module.exports = {
  buildInvoicePdfBuffer,
  buildInvoiceAmounts,
  formatInr,
};
