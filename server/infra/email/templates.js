const config = require("../../config/config");

/**
 * Forgot password OTP email HTML
 */
const getForgotPasswordOtpTemplate = ({
  name,
  otp,
  expiryMinutes,
  appName,
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #27ae60;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .otp-box {
          background-color: #f8f9fa;
          padding: 25px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: center;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #007bff;
          letter-spacing: 8px;
          margin: 15px 0;
          font-family: 'Courier New', monospace;
        }
        .expiry-notice {
          color: #dc3545;
          font-weight: bold;
          margin-top: 15px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          color: #777;
          font-size: 12px;
        }
        .security-notice {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName || ""}</h1>
          <p>Uniting Communities, Empowering Lives</p>
        </div>
        
        <div class="content">
          <p>Hello ${name || "User"},</p>
          
          <p>You have requested to reset your password. Please use the following OTP to verify your identity:</p>
          
          <div class="otp-box">
            <p style="margin-top: 0; color: #555;">Your Password Reset OTP:</p>
            <div class="otp-code">${otp}</div>
            <p class="expiry-notice">This OTP will expire in ${expiryMinutes} minutes.</p>
          </div>
          
          <div class="security-notice">
            <p style="margin: 0;"><strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. Your account remains secure.</p>
          </div>
          
          <p>Please do not share this OTP with anyone. Our team will never ask for your OTP or password.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>For any queries, please contact us at: ${
            config.MAIL_FROM_ADDRESS
          }</p>
          ${appName ? `<p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;
};

const emailLayout = ({ appName, title, bodyHtml }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 24px;
        }
        .header h1 {
          color: #27ae60;
          margin-bottom: 8px;
        }
        .summary-box {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .summary-row {
          display: block;
          margin: 6px 0;
        }
        .cta {
          display: inline-block;
          margin: 16px 0;
          padding: 12px 20px;
          background-color: #27ae60;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          color: #777;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName || ""}</h1>
        </div>
        ${bodyHtml}
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>For any queries, please contact us at: ${config.MAIL_FROM_ADDRESS}</p>
          ${appName ? `<p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;

const formatInr = (amount) => {
  const value = Math.max(0, Number(amount) || 0);
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getOrderPlacedTemplate = ({
  name,
  orderNo,
  orderTotal,
  paymentMethod,
  ordersUrl,
  appName,
}) => {
  const paymentLabel =
    paymentMethod === "cod" ? "Cash on delivery" : String(paymentMethod || "").toUpperCase();

  const bodyHtml = `
        <p>Hello ${name || "Customer"},</p>
        <p>Thank you for your order. We have received it and will keep you updated.</p>
        <div class="summary-box">
          <span class="summary-row"><strong>Order number:</strong> ${orderNo}</span><br />
          <span class="summary-row"><strong>Order total:</strong> ${formatInr(orderTotal)}</span><br />
          <span class="summary-row"><strong>Payment:</strong> ${paymentLabel}</span>
        </div>
        <p><a class="cta" href="${ordersUrl}">View your order</a></p>
        <p>We will notify you when your order ships.</p>
  `;

  return emailLayout({
    appName,
    title: "Order confirmation",
    bodyHtml,
  });
};

const getOrderShippedTemplate = ({
  name,
  orderNo,
  ordersUrl,
  appName,
  carrierName,
  trackingNumber,
  carrierTrackingUrl,
}) => {
  const carrierRow = carrierName
    ? `<span class="summary-row"><strong>Carrier:</strong> ${carrierName}</span><br />`
    : "";
  const awbRow = trackingNumber
    ? `<span class="summary-row"><strong>Tracking number:</strong> ${trackingNumber}</span><br />`
    : "";
  const trackHref = carrierTrackingUrl || ordersUrl;
  const trackLabel = carrierTrackingUrl ? "Track on carrier site" : "Track your order";

  const bodyHtml = `
        <p>Hello ${name || "Customer"},</p>
        <p>Good news — your order has been shipped.</p>
        <div class="summary-box">
          <span class="summary-row"><strong>Order number:</strong> ${orderNo}</span><br />
          ${carrierRow}
          ${awbRow}
        </div>
        <p><a class="cta" href="${trackHref}">${trackLabel}</a></p>
  `;

  return emailLayout({
    appName,
    title: "Order shipped",
    bodyHtml,
  });
};

const getSubjects = (appName) => ({
  FORGOT_PASSWORD_OTP: `Password Reset OTP${appName ? ` - ${appName}` : ""}`,
  ORDER_PLACED: `Order confirmed${appName ? ` - ${appName}` : ""}`,
  ORDER_SHIPPED: `Your order has shipped${appName ? ` - ${appName}` : ""}`,
  CLAIM_SUBMITTED: `Claim request received${appName ? ` - ${appName}` : ""}`,
  CLAIM_APPROVED: `Claim approved${appName ? ` - ${appName}` : ""}`,
  CLAIM_REJECTED: `Claim update${appName ? ` - ${appName}` : ""}`,
  CLAIM_COMPLETED: `Claim resolved${appName ? ` - ${appName}` : ""}`,
});

const getClaimSubmittedTemplate = ({ name, orderNo, claimType, ordersUrl, appName }) => {
  const bodyHtml = `
        <p>Hello ${name || "Customer"},</p>
        <p>We have received your claim request for order <strong>${orderNo}</strong>.</p>
        <div class="summary-box">
          <span class="summary-row"><strong>Claim type:</strong> ${claimType || "—"}</span>
        </div>
        <p>Our team will review your request and update you on the order page.</p>
        <p><a class="cta" href="${ordersUrl}">View claim status</a></p>
  `;
  return emailLayout({ appName, title: "Claim request received", bodyHtml });
};

const getClaimApprovedTemplate = ({
  name,
  orderNo,
  claimType,
  decisionNote,
  ordersUrl,
  appName,
}) => {
  const noteRow = decisionNote
    ? `<span class="summary-row"><strong>Note:</strong> ${decisionNote}</span>`
    : "";
  const bodyHtml = `
        <p>Hello ${name || "Customer"},</p>
        <p>Your claim for order <strong>${orderNo}</strong> has been approved.</p>
        <div class="summary-box">
          <span class="summary-row"><strong>Claim type:</strong> ${claimType || "—"}</span><br />
          ${noteRow}
        </div>
        <p><a class="cta" href="${ordersUrl}">View next steps</a></p>
  `;
  return emailLayout({ appName, title: "Claim approved", bodyHtml });
};

const getClaimRejectedTemplate = ({
  name,
  orderNo,
  claimType,
  decisionNote,
  ordersUrl,
  appName,
}) => {
  const bodyHtml = `
        <p>Hello ${name || "Customer"},</p>
        <p>We reviewed your claim for order <strong>${orderNo}</strong> and could not approve it.</p>
        <div class="summary-box">
          <span class="summary-row"><strong>Claim type:</strong> ${claimType || "—"}</span><br />
          <span class="summary-row"><strong>Reason:</strong> ${decisionNote || "See order details for more information."}</span>
        </div>
        <p><a class="cta" href="${ordersUrl}">View order details</a></p>
  `;
  return emailLayout({ appName, title: "Claim not approved", bodyHtml });
};

const getClaimCompletedTemplate = ({
  name,
  orderNo,
  claimType,
  resolutionNote,
  refundAmount,
  ordersUrl,
  appName,
}) => {
  const refundRow =
    refundAmount != null && Number.isFinite(Number(refundAmount))
      ? `<span class="summary-row"><strong>Refund:</strong> ${formatInr(refundAmount)}</span><br />`
      : "";
  const noteRow = resolutionNote
    ? `<span class="summary-row"><strong>Resolution:</strong> ${resolutionNote}</span>`
    : "";
  const bodyHtml = `
        <p>Hello ${name || "Customer"},</p>
        <p>Your claim for order <strong>${orderNo}</strong> has been resolved.</p>
        <div class="summary-box">
          <span class="summary-row"><strong>Claim type:</strong> ${claimType || "—"}</span><br />
          ${refundRow}
          ${noteRow}
        </div>
        <p><a class="cta" href="${ordersUrl}">View order details</a></p>
  `;
  return emailLayout({ appName, title: "Claim resolved", bodyHtml });
};

module.exports = {
  getForgotPasswordOtpTemplate,
  getOrderPlacedTemplate,
  getOrderShippedTemplate,
  getClaimSubmittedTemplate,
  getClaimApprovedTemplate,
  getClaimRejectedTemplate,
  getClaimCompletedTemplate,
  getSubjects,
  formatInr,
};
