/** Remember-me storage for admin portal (admin ID only; password is never stored). */
export const saveAdminCredentials = (adminId) => {
  try {
    localStorage.setItem("savedAdminId", adminId);
    localStorage.setItem("rememberPassword", "true");
  } catch (error) {
    console.error("Error saving admin credentials to localStorage:", error);
  }
};

export const getAdminCredentials = () => {
  try {
    localStorage.removeItem("savedPassword");
    sessionStorage.removeItem("rememberedPassword");
    const adminId =
      localStorage.getItem("savedAdminId") ||
      localStorage.getItem("savedMemberId") ||
      "";
    const rememberPassword =
      localStorage.getItem("rememberPassword") === "true";

    return {
      adminId: adminId || "",
      password: "",
      rememberPassword,
    };
  } catch (error) {
    console.error("Error reading admin credentials from localStorage:", error);
    return {
      adminId: "",
      password: "",
      rememberPassword: false,
    };
  }
};

export const removeAdminCredentials = () => {
  try {
    localStorage.removeItem("savedPhone");
    localStorage.removeItem("savedMemberId");
    localStorage.removeItem("savedAdminId");
    localStorage.removeItem("rememberPassword");
    localStorage.removeItem("savedPassword");
    sessionStorage.removeItem("rememberedPassword");
  } catch (error) {
    console.error("Error removing credentials from localStorage:", error);
  }
};
