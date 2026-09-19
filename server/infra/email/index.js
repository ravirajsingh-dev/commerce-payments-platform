const emailService = require("./emailService");
const templates = require("./templates");
const brevoClient = require("./brevoClient");
const CommonSettings = require("../../models/CommonSettings");

/**
 * Send forgot password OTP email
 */
const sendForgotPasswordOtpEmail = async (otpRequest) => {
  const { name, email, otp, expiryMinutes } = otpRequest;

  let appName = "";
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    appName = settings.name || "";
  } catch (error) {
    console.error("Error fetching settings for email template:", error);
  }

  const html = templates.getForgotPasswordOtpTemplate({
    name,
    otp,
    expiryMinutes,
    appName,
  });

  const subjects = templates.getSubjects(appName);

  return await emailService.sendEmail({
    to: email,
    subject: subjects.FORGOT_PASSWORD_OTP,
    html: html,
  });
};

const loadAppName = async () => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    return settings.name || "";
  } catch (error) {
    console.error("Error fetching settings for email template:", error);
    return "";
  }
};

const sendOrderPlacedEmail = async (payload) => {
  const { name, email, orderNo, orderTotal, paymentMethod, ordersUrl } = payload;
  const appName = await loadAppName();
  const subjects = templates.getSubjects(appName);

  return emailService.sendEmail({
    to: email,
    subject: subjects.ORDER_PLACED,
    html: templates.getOrderPlacedTemplate({
      name,
      orderNo,
      orderTotal,
      paymentMethod,
      ordersUrl,
      appName,
    }),
  });
};

const sendOrderShippedEmail = async (payload) => {
  const {
    name,
    email,
    orderNo,
    ordersUrl,
    carrierName,
    trackingNumber,
    carrierTrackingUrl,
  } = payload;
  const appName = await loadAppName();
  const subjects = templates.getSubjects(appName);

  return emailService.sendEmail({
    to: email,
    subject: subjects.ORDER_SHIPPED,
    html: templates.getOrderShippedTemplate({
      name,
      orderNo,
      ordersUrl,
      appName,
      carrierName,
      trackingNumber,
      carrierTrackingUrl,
    }),
  });
};

const sendClaimSubmittedEmail = async (payload) => {
  const { name, email, orderNo, claimType, ordersUrl } = payload;
  const appName = await loadAppName();
  const subjects = templates.getSubjects(appName);
  return emailService.sendEmail({
    to: email,
    subject: subjects.CLAIM_SUBMITTED,
    html: templates.getClaimSubmittedTemplate({ name, orderNo, claimType, ordersUrl, appName }),
  });
};

const sendClaimApprovedEmail = async (payload) => {
  const { name, email, orderNo, claimType, decisionNote, ordersUrl } = payload;
  const appName = await loadAppName();
  const subjects = templates.getSubjects(appName);
  return emailService.sendEmail({
    to: email,
    subject: subjects.CLAIM_APPROVED,
    html: templates.getClaimApprovedTemplate({
      name,
      orderNo,
      claimType,
      decisionNote,
      ordersUrl,
      appName,
    }),
  });
};

const sendClaimRejectedEmail = async (payload) => {
  const { name, email, orderNo, claimType, decisionNote, ordersUrl } = payload;
  const appName = await loadAppName();
  const subjects = templates.getSubjects(appName);
  return emailService.sendEmail({
    to: email,
    subject: subjects.CLAIM_REJECTED,
    html: templates.getClaimRejectedTemplate({
      name,
      orderNo,
      claimType,
      decisionNote,
      ordersUrl,
      appName,
    }),
  });
};

const sendClaimCompletedEmail = async (payload) => {
  const { name, email, orderNo, claimType, resolutionNote, refundAmount, ordersUrl } = payload;
  const appName = await loadAppName();
  const subjects = templates.getSubjects(appName);
  return emailService.sendEmail({
    to: email,
    subject: subjects.CLAIM_COMPLETED,
    html: templates.getClaimCompletedTemplate({
      name,
      orderNo,
      claimType,
      resolutionNote,
      refundAmount,
      ordersUrl,
      appName,
    }),
  });
};

module.exports = {
  sendEmail: emailService.sendEmail,
  sendForgotPasswordOtpEmail,
  sendOrderPlacedEmail,
  sendOrderShippedEmail,
  sendClaimSubmittedEmail,
  sendClaimApprovedEmail,
  sendClaimRejectedEmail,
  sendClaimCompletedEmail,
  verifyConnection: brevoClient.verifyConnection,
};
