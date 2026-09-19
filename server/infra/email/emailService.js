const brevoClient = require("./brevoClient");
const config = require("../../config/config");

/**
 * Email Service
 *
 * Purpose: High-level email sending service for the application
 *
 * Features:
 * - Validates email data before sending
 * - Handles errors gracefully (no app crashes)
 * - Logs email operations for debugging
 * - Returns consistent response format
 */

/**
 * Mask sensitive data for logging
 * @param {string} str - String to mask
 * @returns {string} Masked string
 */
const maskSensitive = (str) => {
  if (!str || str.length <= 4) return "****";
  return str.substring(0, 2) + "*".repeat(str.length - 4) + str.slice(-2);
};

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Send email using Brevo API
 *
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email content
 * @param {string} [options.text] - Plain text email content (optional, auto-generated from HTML if not provided)
 * @param {string} [options.fromEmail] - Sender email (defaults to MAIL_FROM_ADDRESS)
 * @param {string} [options.fromName] - Sender name (defaults to MAIL_FROM_NAME)
 * @param {string} [options.replyTo] - Reply-to email (defaults to MAIL_REPLY_TO or fromEmail)
 *
 * @returns {Promise<Object>} Result object with success status and details
 *
 * @example
 * const result = await emailService.sendEmail({
 *   to: "user@example.com",
 *   subject: "Welcome",
 *   html: "<h1>Welcome!</h1>"
 * });
 */
const sendEmail = async (options) => {
  const { to, subject, html, text, fromEmail, fromName, replyTo } = options;

  // Validate required fields
  if (!to) {
    const error = "Recipient email (to) is required";
    console.error("[EMAIL] ❌ Validation error:", error);
    return { success: false, error };
  }

  if (!subject) {
    const error = "Email subject is required";
    console.error("[EMAIL] ❌ Validation error:", error);
    return { success: false, error };
  }

  if (!html) {
    const error = "Email HTML content is required";
    console.error("[EMAIL] ❌ Validation error:", error);
    return { success: false, error };
  }

  // Validate email format
  if (!isValidEmail(to)) {
    const error = `Invalid recipient email format: ${to}`;
    console.error("[EMAIL] ❌ Validation error:", error);
    return { success: false, error };
  }

  // Prepare email data
  const emailData = {
    sender: {
      email: fromEmail || config.MAIL_FROM_ADDRESS,
      name: fromName || config.MAIL_FROM_NAME,
    },
    to: [{ email: to }],
    subject: subject,
    htmlContent: html,
    textContent: text || html.replace(/<[^>]*>/g, ""), // Auto-generate text from HTML if not provided
  };

  // Add reply-to if configured
  const replyToEmail =
    replyTo || config.MAIL_REPLY_TO || emailData.sender.email;
  if (replyToEmail && replyToEmail !== emailData.sender.email) {
    emailData.replyTo = {
      email: replyToEmail,
    };
  }

  try {
    const result = await brevoClient.sendEmail(emailData);

    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    };
  } catch (error) {
    // Log error with context (never crash the app)
    const errorContext = {
      to: to,
      subject: subject,
      error: error.message,
      env: config.NODE_ENV,
      containerName: "unknown",
    };

    console.error("[EMAIL] ❌ Email send failed:", errorContext);

    // Return error response (don't throw - allow caller to handle)
    return {
      success: false,
      error: error.message,
      details: errorContext,
    };
  }
};

module.exports = {
  sendEmail,
};
