const axios = require("axios");
const { BREVO_API_KEY } = require("../../config/config");

/**
 * Brevo (formerly Sendinblue) API Client
 *
 * Purpose: Low-level HTTP client for Brevo Transactional Email API
 *
 * Why Brevo HTTP API instead of SMTP:
 * - DigitalOcean blocks outbound SMTP ports (25, 465, 587) by default
 * - Brevo HTTP API uses HTTPS (port 443) - always accessible
 * - No firewall/Docker network configuration needed
 * - More reliable for cloud infrastructure
 *
 * API Documentation: https://developers.brevo.com/reference/sendtransacemail
 */

const BREVO_API_BASE = "https://api.brevo.com/v3";
const BREVO_EMAIL_ENDPOINT = `${BREVO_API_BASE}/smtp/email`;
const BREVO_ACCOUNT_ENDPOINT = `${BREVO_API_BASE}/account`;

/**
 * Get Brevo API key from environment
 * @returns {string} API key
 * @throws {Error} If API key is not set
 */
const getApiKey = () => {
  const apiKey = BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY environment variable is not set");
  }
  return apiKey;
};

/**
 * Create HTTP headers for Brevo API request
 * @returns {Object} Headers object
 */
const createHeaders = () => ({
  "api-key": getApiKey(),
  "Content-Type": "application/json",
});

/**
 * Verify Brevo API connection and API key validity
 * @returns {Promise<Object>} Account information
 * @throws {Error} If API key is invalid or connection fails
 */
const verifyConnection = async () => {
  try {
    const response = await axios.get(BREVO_ACCOUNT_ENDPOINT, {
      headers: createHeaders(),
      timeout: 10000, // 10 second timeout
    });

    return {
      success: true,
      email: response.data.email,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
    };
  } catch (error) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      apiError: error.response?.data,
    };

    if (error.response?.status === 401) {
      throw new Error("Invalid BREVO_API_KEY. Please check your API key.");
    }

    if (error.response?.status === 403) {
      throw new Error(
        "BREVO_API_KEY does not have required permissions. Ensure 'Send emails' permission is enabled.",
      );
    }

    throw new Error(
      `Brevo API connection failed: ${error.message} (${
        error.response?.status || "NETWORK_ERROR"
      })`,
    );
  }
};

/**
 * Send email via Brevo Transactional Email API
 * @param {Object} emailData - Email data
 * @param {Object} emailData.sender - Sender information
 * @param {string} emailData.sender.email - Sender email address
 * @param {string} emailData.sender.name - Sender name
 * @param {Array} emailData.to - Recipients array
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.htmlContent - HTML email content
 * @param {string} [emailData.textContent] - Plain text email content (optional)
 * @param {Object} [emailData.replyTo] - Reply-to information (optional)
 * @returns {Promise<Object>} API response with messageId
 * @throws {Error} If email sending fails
 */
const sendEmail = async (emailData) => {
  try {
    const response = await axios.post(BREVO_EMAIL_ENDPOINT, emailData, {
      headers: createHeaders(),
      timeout: 15000, // 15 second timeout
    });

    return {
      success: true,
      messageId: response.data.messageId,
      response: response.data,
    };
  } catch (error) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      apiError: error.response?.data,
    };

    if (error.response?.status === 400) {
      throw new Error(
        `Invalid email data: ${error.response?.data?.message || error.message}`,
      );
    }

    if (error.response?.status === 401) {
      throw new Error("Invalid BREVO_API_KEY. Please check your API key.");
    }

    if (error.response?.status === 402) {
      throw new Error("Brevo account limit reached. Please check your plan.");
    }

    throw new Error(
      `Failed to send email: ${error.message} (${
        error.response?.status || "NETWORK_ERROR"
      })`,
    );
  }
};

module.exports = {
  verifyConnection,
  sendEmail,
};
