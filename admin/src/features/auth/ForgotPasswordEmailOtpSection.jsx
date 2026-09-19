import { useEffect, useState } from "react";
import { Alert, Button, Form, InputGroup, Spinner } from "react-bootstrap";
import { FaEnvelope, FaEye, FaEyeSlash, FaKey, FaLock } from "react-icons/fa";

import Errors from "@src/notifications/Errors";
import { validateForm, isValidAdminId } from "@src/utils/validation";
import { PASSWORD_MIN_LENGTH } from "@src/utils/inputValidation";

const ForgotPasswordEmailOtpSection = ({
  isOpen,
  onClose,
  onVerifyAdminId,
  onSendOtp,
  onResendOtp,
  onVerifyOtp,
  onResetPassword,
  isVerifyingAdminId,
  isSendingOtp,
  isResendingOtp,
  isVerifyingOtp,
  isResetting,
  successMessage,
  errorList,
}) => {
  const [step, setStep] = useState(1);
  const [adminId, setAdminId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [adminIdVerified, setAdminIdVerified] = useState(false);
  const [otpSentSuccess, setOtpSentSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setAdminId("");
      setMaskedEmail("");
      setEmail("");
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setError("");
      setResendTimer(0);
      setPasswordMatch(true);
      setAdminIdVerified(false);
      setOtpSentSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!resendTimer) return undefined;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  useEffect(() => {
    setPasswordMatch(!confirmPassword || password === confirmPassword);
  }, [password, confirmPassword]);

  if (!isOpen) return null;

  const isAnyLoading =
    isVerifyingAdminId ||
    isSendingOtp ||
    isResendingOtp ||
    isVerifyingOtp ||
    isResetting;

  const handleAdminIdChange = (e) => {
    setAdminId(
      String(e.target.value || "")
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 15),
    );
  };

  const handleVerifyAdminId = async (e) => {
    e.preventDefault();
    setError("");
    const errors = validateForm({ admin_id: adminId }, [
      {
        path: "admin_id",
        msg: "Enter a valid Admin ID (8–15 letters or numbers).",
        validator: (value) => isValidAdminId(value),
      },
    ]);
    if (errors.length) {
      setError("Enter a valid Admin ID (8–15 letters or numbers).");
      return;
    }
    try {
      const response = await onVerifyAdminId(adminId);
      if (response?.maskedEmail) {
        setMaskedEmail(response.maskedEmail);
        setAdminIdVerified(true);
      }
    } catch (err) {
      setError(err.message || "Invalid Admin ID");
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setOtpSentSuccess(false);
    if (!email || !email.trim()) {
      setError("Email is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please provide a valid email address.");
      return;
    }
    try {
      const response = await onSendOtp(adminId, email.trim());
      if (response?.maskedEmail) {
        setMaskedEmail(response.maskedEmail);
        setOtpSentSuccess(true);
        setResendTimer(60);
        setTimeout(() => {
          setStep(3);
          setOtpSentSuccess(false);
        }, 1800);
      }
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError("");
    try {
      const response = await onResendOtp(adminId);
      if (response?.maskedEmail) {
        setMaskedEmail(response.maskedEmail);
        setResendTimer(60);
      }
    } catch (err) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    const errors = validateForm({ otp }, [
      {
        path: "otp",
        msg: "OTP must be exactly 6 digits.",
        validator: (value) => /^\d{6}$/.test(value),
      },
    ]);
    if (errors.length) {
      setError("OTP must be exactly 6 digits.");
      return;
    }
    try {
      await onVerifyOtp(adminId, otp);
      setStep(4);
    } catch (err) {
      setError(err.message || "Invalid or expired OTP");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH || password.length > 22) {
      setError(
        `Password must be ${PASSWORD_MIN_LENGTH} to 22 characters long.`,
      );
      return;
    }
    const passwordRegex = new RegExp(
      `^[a-zA-Z0-9@#$%^&+=!*\\-_.]{${PASSWORD_MIN_LENGTH},22}$`,
    );
    if (!passwordRegex.test(password)) {
      setError(
        `Password must be ${PASSWORD_MIN_LENGTH} to 22 characters long.`,
      );
      return;
    }
    try {
      await onResetPassword(adminId, otp, password, confirmPassword);
    } catch (err) {
      setError(err.message || "Password reset failed. Please try again.");
    }
  };

  const getTitle = () => {
    if (step === 1 && adminIdVerified) return "Verify Email";
    if (step === 1) return "Verify Admin ID";
    if (step === 2) return "Send OTP";
    if (step === 3) return "Verify OTP";
    return "Reset Password";
  };

  const isResetValid =
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= 22 &&
    confirmPassword.length >= PASSWORD_MIN_LENGTH &&
    confirmPassword.length <= 22 &&
    password === confirmPassword &&
    new RegExp(`^[a-zA-Z0-9@#$%^&+=!*\\-_.]{${PASSWORD_MIN_LENGTH},22}$`).test(
      password,
    );

  return (
    <section className="auth-recovery-card">
      <header className="auth-recovery-head">
        <h2 className="auth-recovery-title">
          {step <= 3 ? <FaKey /> : <FaLock />}
          {getTitle()}
        </h2>
        <Button
          type="button"
          variant="link"
          className="btn btn--link btn--link-muted"
          onClick={onClose}
          disabled={isAnyLoading}
        >
          Back to Login
        </Button>
      </header>

      {error && <Alert variant="danger">{error}</Alert>}
      {otpSentSuccess && (
        <Alert variant="success">OTP sent to {maskedEmail}</Alert>
      )}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      {!successMessage && (
        <Form
          className="auth-recovery-form"
          onSubmit={
            step === 1 && !adminIdVerified
              ? handleVerifyAdminId
              : step === 2
                ? handleSendOtp
                : step === 3
                  ? handleVerifyOtp
                  : handleResetPassword
          }
        >
          {step === 1 && !adminIdVerified && (
            <Form.Group>
              <Form.Label
                htmlFor="forgot-admin-id"
                className="auth-recovery-label"
              >
                Admin ID
              </Form.Label>
              <Form.Control
                id="forgot-admin-id"
                name="admin_id"
                type="text"
                value={adminId}
                onChange={handleAdminIdChange}
                maxLength={15}
                placeholder="Your 8–15 character Admin ID"
                autoComplete="username"
                className={`auth-input ${errorList.admin_id ? "form-input-invalid" : ""}`}
                disabled={isVerifyingAdminId}
              />
              <Errors current_key="admin_id" key="admin_id" />
            </Form.Group>
          )}

          {step === 1 && adminIdVerified && (
            <Form.Group>
              <Form.Label className="auth-recovery-label">
                Registered Email
              </Form.Label>
              <Form.Control
                readOnly
                value={maskedEmail}
                className="auth-input"
              />
            </Form.Group>
          )}

          {step === 2 && (
            <Form.Group>
              <Form.Label
                htmlFor="forgot-email"
                className="auth-recovery-label"
              >
                Email Address
              </Form.Label>
              <Form.Control
                id="forgot-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className={`auth-input ${errorList.email ? "form-input-invalid" : ""}`}
                disabled={isSendingOtp}
              />
              <Errors current_key="email" key="email" />
            </Form.Group>
          )}

          {step === 3 && (
            <>
              <Form.Group>
                <Form.Label
                  htmlFor="forgot-otp"
                  className="auth-recovery-label"
                >
                  OTP
                </Form.Label>
                <Form.Control
                  id="forgot-otp"
                  name="otp"
                  type="text"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  className={`auth-input ${errorList.otp ? "form-input-invalid" : ""}`}
                  disabled={isVerifyingOtp}
                />
                <Errors current_key="otp" key="otp" />
              </Form.Group>
              <p className="auth-recovery-info">OTP sent to {maskedEmail}</p>
              <Button
                type="button"
                variant="link"
                className="btn btn--link"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || isResendingOtp}
              >
                {isResendingOtp
                  ? "Resending..."
                  : resendTimer > 0
                    ? `Resend OTP in ${resendTimer}s`
                    : "Resend OTP"}
              </Button>
            </>
          )}

          {step === 4 && (
            <>
              <Form.Group>
                <Form.Label
                  htmlFor="forgot-password"
                  className="auth-recovery-label"
                >
                  New Password
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    id="forgot-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={`auth-input ${errorList.password ? "form-input-invalid" : ""}`}
                    disabled={isResetting}
                  />
                  <InputGroup.Text
                    className="auth-input-icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </InputGroup.Text>
                </InputGroup>
                <Errors current_key="password" key="password" />
              </Form.Group>

              <Form.Group>
                <Form.Label
                  htmlFor="forgot-confirm-password"
                  className="auth-recovery-label"
                >
                  Confirm Password
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    id="forgot-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={`auth-input ${errorList.confirmPassword ? "form-input-invalid" : ""}`}
                    disabled={isResetting}
                  />
                  <InputGroup.Text
                    className="auth-input-icon"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </InputGroup.Text>
                </InputGroup>
                <Errors current_key="confirmPassword" key="confirmPassword" />
              </Form.Group>
              {confirmPassword && (
                <p
                  className={`auth-recovery-match ${passwordMatch ? "is-valid" : "is-invalid"}`}
                >
                  {passwordMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
            </>
          )}

          <footer className="auth-recovery-actions">
            {((step === 1 && adminIdVerified) || (step > 1 && step < 4)) && (
              <Button
                type="button"
                variant={null}
                className="btn btn--outline"
                disabled={isAnyLoading}
                onClick={() => {
                  if (step === 1 && adminIdVerified) {
                    setAdminIdVerified(false);
                    setEmail("");
                  } else {
                    setStep(step - 1);
                  }
                  setError("");
                }}
              >
                Back
              </Button>
            )}

            {step === 1 && adminIdVerified ? (
              <Button
                type="button"
                variant={null}
                className="btn btn--theme"
                disabled={isAnyLoading}
                onClick={() => {
                  setStep(2);
                  setError("");
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                variant={null}
                className="btn btn--theme"
                disabled={isAnyLoading || (step === 4 && !isResetValid)}
              >
                {isAnyLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      className="me-2"
                    />
                    {step === 2
                      ? "Sending..."
                      : step === 4
                        ? "Resetting..."
                        : "Please wait..."}
                  </>
                ) : (
                  <>
                    {step === 1 && !adminIdVerified && "Verify Admin ID"}
                    {step === 2 && (
                      <>
                        <FaEnvelope /> Send OTP
                      </>
                    )}
                    {step === 3 && "Verify OTP"}
                    {step === 4 && "Reset Password"}
                  </>
                )}
              </Button>
            )}
          </footer>
        </Form>
      )}

      {successMessage && (
        <Button
          type="button"
          variant={null}
          className="btn btn--theme"
          onClick={onClose}
        >
          Close
        </Button>
      )}
    </section>
  );
};

export default ForgotPasswordEmailOtpSection;
