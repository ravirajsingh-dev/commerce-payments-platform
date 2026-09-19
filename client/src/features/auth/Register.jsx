import { useState, useEffect } from "react";
import { Container, Form, Button, InputGroup } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { connect } from "react-redux";

// Icons
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";
import { BiLockAlt } from "react-icons/bi";
import {
  FaRegUser,
  FaHome,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { MdOutlinePhone } from "react-icons/md";
import { IoMailOpenOutline } from "react-icons/io5";

// Custom Imports
import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";
import {
  register,
  setErrors,
  removeRegistrationErrors,
} from "@src/features/auth/authActions";
import { setAlert } from "@src/app/state/actions/alert";
import { handleNumberInput } from "@src/utils/helper";
import { PASSWORD_MIN_LENGTH } from "@src/utils/inputValidation";
import { Badge } from "react-bootstrap";
import CopyIcon from "@src/components/common/CopyIcon";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";

const Register = ({
  errorList,
  setErrors,
  removeRegistrationErrors,
  register,
  loadingRegister,
  setAlert,
  common: { commonSettings, loadingCommonSettings },
}) => {
  const navigate = useNavigate();

  const initialFormData = {
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms_accepted: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    phone: "",
    name: "",
    password: "",
  });

  const { name, phone, email, password, confirmPassword, terms_accepted } =
    formData;

  useEffect(() => {
    return () => {
      removeRegistrationErrors();
    };
  }, [removeRegistrationErrors]);

  const onChange = (e) => {
    if (!e.target) return;
    const { name: fieldName, value, type, checked } = e.target;
    let newValue = type === "checkbox" ? checked : value;
    if (fieldName === "phone" && typeof newValue === "string") {
      newValue = newValue.replace(/\D/g, "").slice(0, 10);
    }
    setFormData({ ...formData, [fieldName]: newValue });
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () =>
    setShowConfirmPassword(!showConfirmPassword);
  const isWelcomeActive = 4 === 1;

  const handleRegisterSubmit = async (e) => {
    try {
      e.preventDefault();
      removeRegistrationErrors();
      setIsLoading(true);

      const form = e.currentTarget;
      if (form.checkValidity() === false) {
        e.stopPropagation();
        setIsLoading(false);
        setValidated(true);
        return;
      }

      setValidated(true);

      const validationRules = [
        {
          path: "name",
          msg: "Please provide a valid name.",
          validator: (value) => String(value || "").trim().length >= 3,
        },
        {
          path: "phone",
          msg: "Please provide a valid phone number.",
          validator: (value) => /^\d{10}$/.test(String(value || "").trim()),
        },
        {
          path: "email",
          msg: "Please provide a valid email address.",
          validator: (value) => value && /\S+@\S+\.\S+/.test(value),
        },
        {
          path: "password",
          msg: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
          validator: (value) => value.length >= PASSWORD_MIN_LENGTH,
        },
        {
          path: "confirmPassword",
          msg: "Passwords do not match.",
          validator: (value) => value === formData.password,
        },
        {
          path: "terms_accepted",
          msg: "You must accept the terms and conditions.",
          validator: (value) => value === true,
        },
      ];

      const errors = validateForm(formData, validationRules);
      if (errors.length) {
        setErrors(errors);
        setIsLoading(false);
        return;
      }

      const submitData = {
        name: String(formData.name).trim(),
        phone: String(formData.phone).trim(),
        email: String(formData.email).trim(),
        password: formData.password,
      };

      const tempRes = await register(submitData);

      if (tempRes?.status && tempRes?.response?.user) {
        setRegistrationData({
          phone: tempRes.response.user.phone || submitData.phone,
          name: formData.name,
          password: formData.password,
        });
        setShowWelcomeModal(true);
      } else {
        const errMsg =
          tempRes?.message ||
          tempRes?.errors?.[0]?.msg ||
          "Registration failed";
        throw new Error(errMsg);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setIsLoading(false);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Registration failed. Please try again.";
      setAlert(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Container fluid className="auth-page">
        <section className="auth-card">
          <Link to="/" className="auth-home-link">
            <FaHome size={18} /> Back to Home
          </Link>

          <header className="auth-header">
            <h1 className="auth-title">
              {loadingCommonSettings
                ? "Loading..."
                : commonSettings?.abbreviation
                  ? `Begin Your ${commonSettings.abbreviation} Journey`
                  : "Begin Your Journey"}
            </h1>
            <p className="auth-subtitle">
              Create your account and start shopping.
            </p>
          </header>

          <Form
            noValidate
            validated={validated}
            className="auth-form"
            onSubmit={handleRegisterSubmit}
          >
            <Form.Group>
              <Form.Label htmlFor="name" className="auth-label">
                <FaRegUser size={18} className="auth-label-icon" />
                Name *
              </Form.Label>
              <Form.Control
                required
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={onChange}
                placeholder="Enter your full name"
                className={`auth-input ${errorList.name ? "form-input-invalid" : ""}`}
              />
              <Errors current_key="name" key="name" />
            </Form.Group>

            <Form.Group>
              <Form.Label htmlFor="phone" className="auth-label">
                <MdOutlinePhone size={20} className="auth-label-icon" />
                Phone Number *
              </Form.Label>
              <Form.Control
                required
                type="tel"
                id="phone"
                name="phone"
                value={phone}
                onChange={onChange}
                maxLength="10"
                minLength="10"
                placeholder="Enter your phone number"
                className={`auth-input ${errorList.phone ? "form-input-invalid" : ""}`}
                onKeyDown={handleNumberInput}
              />
              <Errors current_key="phone" key="phone" />
            </Form.Group>

            <Form.Group>
              <Form.Label htmlFor="email" className="auth-label">
                <IoMailOpenOutline size={20} className="auth-label-icon" />
                Email *
              </Form.Label>
              <Form.Control
                required
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={onChange}
                placeholder="Enter your email address"
                className={`auth-input ${errorList.email ? "form-input-invalid" : ""}`}
              />
              <Errors current_key="email" key="email" />
            </Form.Group>

            <Form.Group>
              <Form.Label htmlFor="password" className="auth-label">
                <BiLockAlt size={20} className="auth-label-icon" />
                Password *
              </Form.Label>
              <InputGroup>
                <Form.Control
                  required
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={onChange}
                  placeholder={`Enter password (min ${PASSWORD_MIN_LENGTH} characters)`}
                  className={`auth-input ${errorList.password ? "form-input-invalid" : ""}`}
                  minLength={PASSWORD_MIN_LENGTH}
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

            <Form.Group>
              <Form.Label htmlFor="confirmPassword" className="auth-label">
                <BiLockAlt size={20} className="auth-label-icon" />
                Confirm Password *
              </Form.Label>
              <InputGroup>
                <Form.Control
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={onChange}
                  placeholder="Confirm your password"
                  className={`auth-input ${errorList.confirmPassword ? "form-input-invalid" : ""}`}
                  minLength={PASSWORD_MIN_LENGTH}
                />
                <InputGroup.Text
                  className="auth-input-icon"
                  onClick={toggleShowConfirmPassword}
                >
                  {showConfirmPassword ? (
                    <AiOutlineEye size={20} />
                  ) : (
                    <AiOutlineEyeInvisible size={20} />
                  )}
                </InputGroup.Text>
              </InputGroup>
              <Errors current_key="confirmPassword" key="confirmPassword" />
            </Form.Group>

            <Form.Group className="auth-checkbox">
              <Form.Check
                type="checkbox"
                id="terms_accepted"
                name="terms_accepted"
                checked={terms_accepted}
                onChange={onChange}
                label="I accept the terms and conditions *"
                className={errorList.terms_accepted ? "form-input-invalid" : ""}
              />
              <Errors current_key="terms_accepted" key="terms_accepted" />
            </Form.Group>

            <Button
              type="submit"
              variant={null}
              className="btn btn--theme btn--full"
              disabled={isLoading || loadingRegister}
            >
              {isLoading || loadingRegister ? "Registering..." : "Register"}
            </Button>

            <p className="auth-switch-text">
              Already have an account?{" "}
              <Link to="/login" className="auth-switch-link">
                Login
              </Link>
            </p>
          </Form>
        </section>
      </Container>

      <AdvancedModal
        show={showWelcomeModal}
        onHide={() => {
          setShowWelcomeModal(false);
          navigate("/login");
        }}
        icon={
          isWelcomeActive ? (
            <FaCheckCircle className="common-modal-icon is-success" />
          ) : (
            <FaExclamationCircle className="common-modal-icon is-warning" />
          )
        }
        backdrop="static"
        keyboard={false}
        bodyClassName="text-preserve-line-breaks"
        actions={[
          {
            label: isWelcomeActive ? "Go to Login" : "Close",
            onClick: () => {
              setShowWelcomeModal(false);
              navigate("/login");
            },
            className: "btn btn--theme",
          },
        ]}
      >
        <p>
          <strong>
            {isWelcomeActive
              ? `Congratulations ${registrationData.name}!`
              : `Welcome ${registrationData.name}!`}
          </strong>
        </p>
        {isWelcomeActive ? (
          <p>
            You have successfully registered for the Community Portal
            {commonSettings?.abbreviation && (
              <>
                &nbsp;by&nbsp;
                <strong>{commonSettings.abbreviation.toUpperCase()}</strong>
              </>
            )}
            . Your payment has been processed and your account is now{" "}
            <strong>ACTIVE</strong>.
          </p>
        ) : (
          <p>
            You have registered for the Community Portal
            {commonSettings?.abbreviation && (
              <>
                &nbsp;by&nbsp;
                <strong>{commonSettings.abbreviation.toUpperCase()}</strong>
              </>
            )}
            . However, your payment is incomplete. Please complete the payment
            to activate your account.
          </p>
        )}
        <div className="d-grid common-modal-credentials">
          <div className="common-modal-credential-item">
            <span className="wallet-label">Phone (login ID):</span>{" "}
            <span className="wallet-value">
              {registrationData.phone}
              <CopyIcon
                textToCopy={registrationData.phone}
                onCopy={() =>
                  setAlert("Phone number copied to clipboard", "success")
                }
              />
            </span>
          </div>
          <div className="common-modal-credential-item">
            <span className="wallet-label">Password:</span>{" "}
            <span className="wallet-value">
              {registrationData.password}
              <CopyIcon
                textToCopy={registrationData.password}
                onCopy={() =>
                  setAlert("Password copied to clipboard", "success")
                }
              />
            </span>
          </div>
          <div className="common-modal-status">
            <Badge bg={isWelcomeActive ? "success" : "warning"}>
              Status: {isWelcomeActive ? "ACTIVE" : "GUEST"}
            </Badge>
          </div>
        </div>
        {isWelcomeActive ? (
          <p>
            Thank you for joining our community platform! Together, we can unite
            communities, support education, sports, culture, and make a
            meaningful impact through donations and social initiatives.
          </p>
        ) : (
          <p className="common-modal-note-warning">
            Please complete your payment to activate your account and access all
            features. You can log in with your registered phone number and
            password and complete the payment from your dashboard.
          </p>
        )}
      </AdvancedModal>
    </>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingRegister: state.auth.loadingRegister,
  common: state.common,
});

export default connect(mapStateToProps, {
  setErrors,
  removeRegistrationErrors,
  register,
  setAlert,
})(Register);
