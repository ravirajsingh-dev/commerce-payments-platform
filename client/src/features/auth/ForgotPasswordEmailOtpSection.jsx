import { useEffect, useState } from "react";
import { Alert, Button, Form, InputGroup, Spinner } from "react-bootstrap";
import { FaEnvelope, FaEye, FaEyeSlash, FaKey, FaLock } from "react-icons/fa";

import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { handleNumberInput } from "@src/utils/helper";
import { PASSWORD_MIN_LENGTH } from "@src/utils/inputValidation";

const ForgotPasswordEmailOtpSection = ({
  isOpen,
  onClose,
  onVerifyPhone,
  onSendOtp,
  onResendOtp,
  onVerifyOtp,
  onResetPassword,
  isVerifyingPhone,
  isSendingOtp,
  isResendingOtp,
  isVerifyingOtp,
  isResetting,
  successMessage,
  errorList,
}) => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
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
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSentSuccess, setOtpSentSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setPhone("");
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
      setPhoneVerified(false);
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
    isVerifyingPhone ||
    isSendingOtp ||
    isResendingOtp ||
    isVerifyingOtp ||
    isResetting;

  const handlePhoneChange = (e) => {
    setPhone(
      String(e.target.value || "")
        .replace(/\D/g, "")
        .slice(0, 10),
    );
  };

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setError("");
    const errors = validateForm({ phone }, [
      {
        path: "phone",
        msg: "Please enter your 10-digit registered phone number.",
        validator: (value) => /^\d{10}$/.test(String(value || "").trim()),
      },
    ]);
    if (errors.length) {
      setError("Please enter your 10-digit registered phone number.");
      return;
    }
    try {
      const response = await onVerifyPhone(phone);
      if (response?.maskedEmail) {
        setMaskedEmail(response.maskedEmail);
        setPhoneVerified(true);
      }
    } catch (err) {
      setError(err.message || "Invalid phone number");
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
      const response = await onSendOtp(phone, email.trim());
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
      const response = await onResendOtp(phone);
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
      await onVerifyOtp(phone, otp);
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
      setError(`Password must be ${PASSWORD_MIN_LENGTH} to 22 characters long.`);
      return;
    }
    const passwordRegex = new RegExp(
      `^[a-zA-Z0-9@#$%^&+=!*\\-_.]{${PASSWORD_MIN_LENGTH},22}$`,
    );
    if (!passwordRegex.test(password)) {
      setError(`Password must be ${PASSWORD_MIN_LENGTH} to 22 characters long.`);
      return;
    }
    try {
      await onResetPassword(phone, otp, password, confirmPassword);
    } catch (err) {
      setError(err.message || "Password reset failed. Please try again.");
    }
  };

  const getTitle = () => {
    if (step === 1 && phoneVerified) return "Verify Email";
    if (step === 1) return "Verify Phone";
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
            step === 1 && !phoneVerified
              ? handleVerifyPhone
              : step === 2
                ? handleSendOtp
                : step === 3
                  ? handleVerifyOtp
                  : handleResetPassword
          }
        >
          {step === 1 && !phoneVerified && (
            <Form.Group>
              <Form.Label
                htmlFor="forgot-phone"
                className="auth-recovery-label"
              >
                Phone Number
              </Form.Label>
              <Form.Control
                id="forgot-phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                onKeyDown={handleNumberInput}
                maxLength={10}
                placeholder="Enter 10-digit registered number"
                className={`auth-input ${errorList.phone ? "form-input-invalid" : ""}`}
                disabled={isVerifyingPhone}
              />
              <Errors current_key="phone" key="phone" />
            </Form.Group>
          )}

          {step === 1 && phoneVerified && (
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
            {((step === 1 && phoneVerified) || (step > 1 && step < 4)) && (
              <Button
                type="button"
                variant={null}
                className="btn btn--outline"
                disabled={isAnyLoading}
                onClick={() => {
                  if (step === 1 && phoneVerified) {
                    setPhoneVerified(false);
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

            {step === 1 && phoneVerified ? (
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
                    {step === 1 && !phoneVerified && "Verify Phone"}
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
