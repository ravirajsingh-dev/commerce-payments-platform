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

  const handleVerifyPhoneForEmailOtp = async (phoneValue) => {
    const response = await verifyForgotPasswordEmailMemberId(phoneValue);
    return response;
  };

  const handleSendEmailOtp = async (phoneValue, email) => {
    const response = await sendForgotPasswordEmailOtp(phoneValue, email);
    return response;
  };

  const handleResendEmailOtp = async (phoneValue) => {
    const response = await resendForgotPasswordEmailOtp(phoneValue);
    return response;
  };

  const handleVerifyEmailOtp = async (phoneValue, otp) => {
    const response = await verifyForgotPasswordEmailOtp(phoneValue, otp);
    return response;
  };

  const handleResetPasswordWithEmailOtp = async (
    phoneValue,
    otp,
    password,
    confirmPassword,
  ) => {
    await resetPasswordWithEmailOtp(phoneValue, otp, password, confirmPassword);
    setForgotPasswordSuccess(
      "Password reset successfully! You can now login with your new password.",
    );
  };

  const resetForgotPasswordState = () => {
    setTimeout(() => {
      setForgotPasswordSuccess("");
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
    handleVerifyPhoneForEmailOtp,
    handleSendEmailOtp,
    handleResendEmailOtp,
    handleVerifyEmailOtp,
    handleResetPasswordWithEmailOtp,
  };
};

export default useForgotPasswordFlow;
