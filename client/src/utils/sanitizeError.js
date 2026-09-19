/**
 * Client-side error sanitization utility.
 * Returns generic, white-label safe messages for user display.
 * Use when displaying error messages from API responses or network errors.
 */

/**
 * Sanitize error message for safe user display
 * @param {string} [message] - Raw error message
 * @returns {string} - Generic, safe message
 */
export const sanitizeGenericError = (message) => {
  if (!message || typeof message !== "string") {
    return "An error occurred";
  }

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  if (lowerMessage.includes("timeout")) {
    return "Request timed out. Please try again.";
  }
  if (lowerMessage.includes("invalid") && lowerMessage.includes("credential")) {
    return "Invalid credentials";
  }
  if (lowerMessage.includes("session") || lowerMessage.includes("expired")) {
    return "Session expired. Please sign in again.";
  }

  return "An error occurred";
};
