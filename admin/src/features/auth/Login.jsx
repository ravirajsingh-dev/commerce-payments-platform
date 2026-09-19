import { useEffect, useState } from "react";
import { Container, Form, Button, InputGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { connect } from "react-redux";

// Custom Imports
import { validateForm, isValidAdminId } from "@src/utils/validation";
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
import ForgotPasswordEmailOtpSection from "./ForgotPasswordEmailOtpSection";
import useForgotPasswordFlow from "./useForgotPasswordFlow";

import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";
import { BiLockAlt } from "react-icons/bi";
import { TbIdBadge2 } from "react-icons/tb";
import { getAdminCredentials } from "@src/utils/credentialsHelper";
import { getAppDisplayName } from "@src/utils/helper";
import { getCommonSettings } from "@src/app/state/actions/commonActions";

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
  common: { commonSettings },
  getCommonSettings,
}) => {
  const navigate = useNavigate();

  const initialFormData = {
    admin_id: "",
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
    handleVerifyAdminIdForForgotPassword,
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

  const { admin_id, password, rememberPassword } = formData;

  const isVerifyingMemberId = auth.forgotPasswordEmailVerifyMemberIdLoading;
  const isSendingOtp = auth.forgotPasswordEmailSendOtpLoading;
  const isResendingOtp = auth.forgotPasswordEmailResendOtpLoading;
  const isVerifyingOtp = auth.forgotPasswordEmailVerifyOtpLoading;
  const isResettingPassword = auth.forgotPasswordEmailResetLoading;

  const onChange = (e) => {
    if (!e.target) return;
    const { name, value, type, checked } = e.target;
    let newValue = type === "checkbox" ? checked : value;
    if (name === "admin_id" && typeof newValue === "string") {
      newValue = newValue.replace(/[^A-Za-z0-9]/g, "").slice(0, 15);
    }
    setFormData({ ...formData, [name]: newValue });
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);

  useEffect(() => {
    getCommonSettings();
  }, [getCommonSettings]);

  useEffect(() => {
    const storedCredentials = getAdminCredentials();
    if (storedCredentials?.rememberPassword && storedCredentials?.adminId) {
      setFormData((prev) => ({
        ...prev,
        admin_id: storedCredentials.adminId,
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
        path: "admin_id",
        msg: "Enter a valid Admin ID (8–15 letters or numbers).",
        validator: (value) => isValidAdminId(value),
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

    login(submitData, navigate);
  };

  return (
    <>
      <Container fluid className="auth-page">
        <section className="auth-card">
          {!showForgotPasswordEmailOtpSection ? (
            <>
              <header className="auth-header">
                <h1 className="auth-title">
                  Welcome to {getAppDisplayName(commonSettings)}
                </h1>
                <p className="auth-subtitle">
                  Sign in with your Admin ID and password.
                </p>
              </header>

              <Form
                noValidate
                validated={validated}
                onSubmit={onSubmit}
                className="auth-form"
              >
                <Form.Group>
                  <Form.Label htmlFor="admin_id" className="auth-label">
                    <TbIdBadge2 size={22} className="auth-label-icon" />
                    Admin ID *
                  </Form.Label>
                  <Form.Control
                    required
                    type="text"
                    id="admin_id"
                    name="admin_id"
                    value={admin_id}
                    onChange={onChange}
                    placeholder="Your 8–15 character Admin ID"
                    autoComplete="username"
                    maxLength={15}
                    className={`auth-input ${errorList.admin_id ? "form-input-invalid" : ""}`}
                  />
                  <Form.Text className="auth-help-text">
                    Use the alphanumeric Admin ID issued to your account.
                  </Form.Text>
                  <Errors current_key="admin_id" key="admin_id" />
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
                      autoComplete="current-password"
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
              </Form>
            </>
          ) : (
            <ForgotPasswordEmailOtpSection
              isOpen={showForgotPasswordEmailOtpSection}
              onClose={handleCloseEmailOtpModal}
              onVerifyAdminId={handleVerifyAdminIdForForgotPassword}
              onSendOtp={handleSendEmailOtp}
              onResendOtp={handleResendEmailOtp}
              onVerifyOtp={handleVerifyEmailOtp}
              onResetPassword={handleResetPasswordWithEmailOtp}
              isVerifyingAdminId={isVerifyingMemberId}
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
  getCommonSettings,
  login,
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
})(Login);
