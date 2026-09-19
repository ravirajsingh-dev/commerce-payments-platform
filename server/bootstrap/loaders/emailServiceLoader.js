/**
 * Email Service Loader Module
 * 
 * Verifies email service (Brevo API) connection on application startup.
 * This ensures the email service is properly configured before the server
 * starts accepting requests. If verification fails, the server will still
 * start but email functionality may not work.
 */

const emailService = require("../../infra/email/index");

/**
 * Load and verify email service connection
 * @returns {Promise<void>}
 */
const loadEmailService = async () => {
  try {
    // Verify Brevo API connection on startup (fail fast if unreachable)
    // Uses HTTPS (port 443) - no SMTP port blocking issues on DigitalOcean
    const accountInfo = await emailService.verifyConnection();
    console.log("📧 Brevo API connection verified and ready");
  } catch (err) {
    // Error handling is done in brevoClient - just log here
    console.error("⚠️  Brevo API verification failed:", err.message);
    console.error(
      "⚠️  Email sending may not work. Check BREVO_API_KEY environment variable.",
    );
    // Don't crash server - allow app to start even if email service is misconfigured
  }
};

module.exports = {
  loadEmailService,
};
