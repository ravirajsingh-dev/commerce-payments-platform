// localStorage helper functions for saving user identifier only
export const saveUserCredentials = (phone) => {
  try {
    localStorage.setItem("savedPhone", phone);
    localStorage.setItem("rememberPassword", "true");
  } catch (error) {
    console.error("Error saving credentials to localStorage:", error);
  }
};

export const getUserCredentials = () => {
  try {
    // Always remove legacy password persistence keys.
    localStorage.removeItem("savedPassword");
    sessionStorage.removeItem("rememberedPassword");
    const phone =
      localStorage.getItem("savedPhone") ||
      localStorage.getItem("savedMemberId") ||
      "";
    const rememberPassword =
      localStorage.getItem("rememberPassword") === "true";

    return {
      phone: phone || "",
      password: "",
      rememberPassword,
    };
  } catch (error) {
    console.error("Error getting credentials from localStorage:", error);
    return {
      phone: "",
      password: "",
      rememberPassword: false,
    };
  }
};

export const removeUserCredentials = () => {
  try {
    localStorage.removeItem("savedPhone");
    localStorage.removeItem("savedMemberId");
    localStorage.removeItem("rememberPassword");
    // Cleanup legacy insecure keys from older builds
    localStorage.removeItem("savedPassword");
    sessionStorage.removeItem("rememberedPassword");
  } catch (error) {
    console.error("Error removing credentials from localStorage:", error);
  }
};
