import { useEffect, useState } from "react";
import { Container, Form, Button, InputGroup } from "react-bootstrap";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { connect } from "react-redux";

// Custom Imports
import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";
import {
  login,
  setErrors,
  removeRegistrationErrors,
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
} from "@src/features/auth/authActions";
import { handleNumberInput } from "@src/utils/helper";

// Icons
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";
import { BiLockAlt } from "react-icons/bi";
import { FaRegUser, FaHome } from "react-icons/fa";
import { getUserCredentials } from "@src/utils/credentialsHelper";
import ForgotPasswordEmailOtpSection from "./ForgotPasswordEmailOtpSection";
import useForgotPasswordFlow from "./useForgotPasswordFlow";

const Login = ({
  errorList,
  setErrors,
  removeRegistrationErrors,
  login,
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
  auth,
  common: { commonSettings, loadingCommonSettings },
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    typeof location.state?.from === "string" &&
    location.state.from.startsWith("/")
      ? location.state.from
      : null;

  const initialFormData = {
    phone: "",
    password: "",
    rememberPassword: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    showForgotPasswordEmailOtpSection,
    forgotPasswordSuccess,
    openEmailOtpModal,
    handleCloseEmailOtpModal,
    handleVerifyPhoneForEmailOtp,
    handleSendEmailOtp,
    handleResendEmailOtp,
    handleVerifyEmailOtp,
    handleResetPasswordWithEmailOtp,
  } = useForgotPasswordFlow({
    verifyForgotPasswordEmailMemberId,
    sendForgotPasswordEmailOtp,
    resendForgotPasswordEmailOtp,
    verifyForgotPasswordEmailOtp,
    resetPasswordWithEmailOtp,
  });

  const { phone, password, rememberPassword } = formData;

  // Get loading states from Redux
  const isVerifyingMemberId = auth.forgotPasswordEmailVerifyMemberIdLoading;
  const isSendingOtp = auth.forgotPasswordEmailSendOtpLoading;
  const isResendingOtp = auth.forgotPasswordEmailResendOtpLoading;
  const isVerifyingOtp = auth.forgotPasswordEmailVerifyOtpLoading;
  const isResettingPassword = auth.forgotPasswordEmailResetLoading;

  const onChange = (e) => {
    if (!e.target) return;
    const { name, value, type, checked } = e.target;
    let newValue = type === "checkbox" ? checked : value;
    if (name === "phone" && typeof newValue === "string") {
      newValue = newValue.replace(/\D/g, "").slice(0, 10);
    }
    setFormData({ ...formData, [name]: newValue });
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);

  useEffect(() => {
    const storedCredentials = getUserCredentials();
    if (storedCredentials?.rememberPassword && storedCredentials?.phone) {
      setFormData((prev) => ({
        ...prev,
        phone: storedCredentials.phone,
        rememberPassword: true,
      }));
    }
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    removeRegistrationErrors();

    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
    }

    setValidated(true);

    const validationRules = [
      {
        path: "phone",
        msg: "Please enter your 10-digit registered phone number.",
        validator: (value) => /^\d{10}$/.test(String(value || "").trim()),
      },
      { path: "password", msg: "Please provide a valid password." },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const submitData = Object.fromEntries(
      Object.entries(formData).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );

    login(submitData, navigate, { returnTo });
  };

  return (
    <>
      <Container fluid className="auth-page">
        <section className="auth-card">
          <Link to="/" className="auth-home-link">
            <FaHome size={18} /> Back to Home
          </Link>

          {!showForgotPasswordEmailOtpSection ? (
            <>
              <header className="auth-header">
                <h1 className="auth-title">
                  {loadingCommonSettings
                    ? "Loading..."
                    : commonSettings?.abbreviation
                      ? `Welcome to ${commonSettings.abbreviation}`
                      : "Welcome"}
                </h1>
                <p className="auth-subtitle">
                  Login with your registered details.
                </p>
              </header>

              <Form
                noValidate
                validated={validated}
                onSubmit={onSubmit}
                className="auth-form"
              >
                <Form.Group>
                  <Form.Label htmlFor="phone" className="auth-label">
                    <FaRegUser size={18} className="auth-label-icon" />
                    Phone *
                  </Form.Label>
                  <Form.Control
                    required
                    type="tel"
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={onChange}
                    onKeyDown={handleNumberInput}
                    placeholder="10-digit registered phone number"
                    maxLength={10}
                    className={`auth-input ${errorList.phone ? "form-input-invalid" : ""}`}
                  />
                  <Form.Text className="auth-help-text">
                    Log in with your registered mobile number.
                  </Form.Text>
                  <Errors current_key="phone" key="phone" />
                </Form.Group>

                <Form.Group>
                  <Form.Label htmlFor="password" className="auth-label">
                    <BiLockAlt size={20} className="auth-label-icon" />
                    Password
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      required
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      name="password"
                      className={`auth-input ${errorList.password ? "form-input-invalid" : ""}`}
                      onChange={onChange}
                      placeholder="Password"
                    />
                    <InputGroup.Text
                      className="auth-input-icon"
                      onClick={toggleShowPassword}
                    >
                      {showPassword ? (
                        <AiOutlineEye size={20} />
                      ) : (
                        <AiOutlineEyeInvisible size={20} />
                      )}
                    </InputGroup.Text>
                  </InputGroup>
                  <Errors current_key="password" key="password" />
                </Form.Group>

                <div className="auth-inline">
                  <Form.Check
                    label="Remember password"
                    id="rememberPassword"
                    name="rememberPassword"
                    checked={rememberPassword}
                    onChange={onChange}
                  />
                  <Button
                    variant="link"
                    className="btn btn--link"
                    onClick={openEmailOtpModal}
                  >
                    Forgot Password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  variant={null}
                  className="btn btn--theme btn--full"
                >
                  Submit
                </Button>

                <p className="auth-switch-text">
                  Don't have an account?{" "}
                  <Link to="/register" className="auth-switch-link">
                    Register
                  </Link>
                </p>
              </Form>
            </>
          ) : (
            <ForgotPasswordEmailOtpSection
              isOpen={showForgotPasswordEmailOtpSection}
              onClose={handleCloseEmailOtpModal}
              onVerifyPhone={handleVerifyPhoneForEmailOtp}
              onSendOtp={handleSendEmailOtp}
              onResendOtp={handleResendEmailOtp}
              onVerifyOtp={handleVerifyEmailOtp}
              onResetPassword={handleResetPasswordWithEmailOtp}
              isVerifyingPhone={isVerifyingMemberId}
              isSendingOtp={isSendingOtp}
              isResendingOtp={isResendingOtp}
              isVerifyingOtp={isVerifyingOtp}
              isResetting={isResettingPassword}
              successMessage={forgotPasswordSuccess}
              errorList={errorList}
            />
          )}
        </section>
      </Container>
    </>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  auth: state.auth,
  common: state.common,
});

export default connect(mapStateToProps, {
  setErrors,
  removeRegistrationErrors,
  login,
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
})(Login);
