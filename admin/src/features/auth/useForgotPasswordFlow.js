import { useState } from "react";

const useForgotPasswordFlow = ({
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
}) => {
  const [
    showForgotPasswordEmailOtpSection,
    setShowForgotPasswordEmailOtpSection,
  ] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState("");
  const [, setForgotPasswordError] = useState("");

  const handleVerifyAdminIdForForgotPassword = async (adminIdValue) => {
    const response = await verifyForgotPasswordEmailMemberId(adminIdValue);
    return response;
  };

  const handleSendEmailOtp = async (adminIdValue, email) => {
    const response = await sendForgotPasswordEmailOtp(adminIdValue, email);
    return response;
  };

  const handleResendEmailOtp = async (adminIdValue) => {
    const response = await resendForgotPasswordEmailOtp(adminIdValue);
    return response;
  };

  const handleVerifyEmailOtp = async (adminIdValue, otp) => {
    const response = await verifyForgotPasswordEmailOtp(adminIdValue, otp);
    return response;
  };

  const handleResetPasswordWithEmailOtp = async (
    adminIdValue,
    otp,
    password,
    confirmPassword,
  ) => {
    await resetPasswordWithEmailOtp(
      adminIdValue,
      otp,
      password,
      confirmPassword,
    );
    setForgotPasswordSuccess(
      "Password reset successfully! You can now login with your new password.",
    );
  };

  const resetForgotPasswordState = () => {
    setTimeout(() => {
      setForgotPasswordSuccess("");
      setForgotPasswordError("");
    }, 300);
  };

  const openEmailOtpModal = () => {
    setShowForgotPasswordEmailOtpSection(true);
  };

  const handleCloseEmailOtpModal = () => {
    setShowForgotPasswordEmailOtpSection(false);
    resetForgotPasswordState();
  };

  return {
    showForgotPasswordEmailOtpSection,
    forgotPasswordSuccess,
    openEmailOtpModal,
    handleCloseEmailOtpModal,
    handleVerifyAdminIdForForgotPassword,
    handleSendEmailOtp,
    handleResendEmailOtp,
    handleVerifyEmailOtp,
    handleResetPasswordWithEmailOtp,
  };
};

export default useForgotPasswordFlow;
