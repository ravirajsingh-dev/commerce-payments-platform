import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Button, Container, Form, InputGroup } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaBox,
  FaHeart,
  FaLock,
  FaMapMarkerAlt,
  FaUser,
} from "react-icons/fa";
import AddressBookPanel from "@src/features/addresses/components/AddressBookPanel";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import {
  getContactValidationRules,
  sanitizeEmail,
  sanitizeName,
  sanitizePhone,
} from "@src/utils/inputValidation";
import { removeAllErrors } from "@src/app/state/actions/commonActions";
import {
  changePassword,
  setErrors,
  updateProfile,
} from "@src/features/auth/authActions";

const initialFormData = {
  name: "",
  phone: "",
  email: "",
};

const ACCOUNT_SECTIONS = [
  {
    id: "profile",
    label: "Profile Details",
    shortLabel: "Profile",
    description: "Your personal details for orders and communication.",
    icon: FaUser,
  },
  {
    id: "password",
    label: "Login Password",
    shortLabel: "Password",
    description: "Keep your account secure with a strong password.",
    icon: FaLock,
  },
  {
    id: "addresses",
    label: "Saved Addresses",
    shortLabel: "Addresses",
    description: "Delivery locations for a seamless checkout experience.",
    icon: FaMapMarkerAlt,
  },
  {
    id: "wishlist",
    label: "Wishlist",
    shortLabel: "Wishlist",
    description: "Saved pieces you want to revisit or buy later.",
    icon: FaHeart,
  },
  {
    id: "orders",
    label: "Order History",
    shortLabel: "Orders",
    description: "Review past purchases, track shipments, and invoices.",
    icon: FaBox,
  },
];

const resolveSection = (search) => {
  const params = new URLSearchParams(search);
  const section = params.get("section") || params.get("tab");
  if (
    section === "password" ||
    section === "addresses" ||
    section === "wishlist" ||
    section === "orders"
  ) {
    return section;
  }
  return "profile";
};

const MyAccount = ({
  auth: { user, loadingOnChangePassword },
  errorList,
  setErrors,
  removeAllErrors,
  updateProfile,
  changePassword,
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(() =>
    resolveSection(location.search),
  );
  const [isProfileEditable, setIsProfileEditable] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    oldPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    removeAllErrors();
  }, [removeAllErrors]);

  useEffect(() => {
    const nextSection = resolveSection(location.search);
    if (nextSection === "orders") {
      navigate("/user/orders", { replace: true });
      return;
    }
    if (nextSection === "wishlist") {
      navigate("/user/wishlist", { replace: true });
      return;
    }
    setActiveSection(nextSection);
  }, [location.search, navigate]);

  useEffect(() => {
    setFormData({
      name: user?.name || "",
      phone: user?.phone || "",
      email: user?.email || "",
    });
    setFieldTouched({});
    setSubmitAttempted(false);
    setIsProfileEditable(false);
  }, [user]);

  const activeSectionMeta = useMemo(
    () =>
      ACCOUNT_SECTIONS.find((section) => section.id === activeSection) ||
      ACCOUNT_SECTIONS[0],
    [activeSection],
  );

  const profileInitial = useMemo(() => {
    const source = (user?.name || user?.email || "U").trim();
    return source.charAt(0).toUpperCase();
  }, [user?.email, user?.name]);

  const localValidationErrors = useMemo(() => {
    const errors = {};
    const rules = getContactValidationRules();
    const validationErrors = validateForm(formData, rules);
    validationErrors.forEach((error) => {
      errors[error.path] = error.msg;
    });
    return errors;
  }, [formData]);

  const visibleLocalErrors = useMemo(() => {
    const errors = {};
    Object.entries(localValidationErrors).forEach(([path, msg]) => {
      if (fieldTouched[path] || submitAttempted) {
        errors[path] = msg;
      }
    });
    return errors;
  }, [fieldTouched, localValidationErrors, submitAttempted]);

  const selectSection = (sectionId) => {
    const target = ACCOUNT_SECTIONS.find((section) => section.id === sectionId);
    if (!target || target.disabled) return;

    if (sectionId === "orders") {
      navigate("/user/orders");
      return;
    }

    setActiveSection(sectionId);
    removeAllErrors();

    const nextSearch =
      sectionId === "profile" ? "" : `?section=${sectionId}`;
    navigate(
      {
        pathname: "/user/my-account",
        search: nextSearch,
      },
      { replace: true },
    );
  };

  const onChange = (e) => {
    if (!e?.target) return;
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === "name") sanitizedValue = sanitizeName(value);
    if (name === "phone") sanitizedValue = sanitizePhone(value);
    if (name === "email") sanitizedValue = sanitizeEmail(value);

    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
  };

  const onBlur = (e) => {
    const name = e?.target?.name;
    if (!name) return;
    setFieldTouched((prev) => ({ ...prev, [name]: true }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isProfileEditable) return;
    removeAllErrors();
    setSubmitAttempted(true);

    const rules = getContactValidationRules();
    const errors = validateForm(formData, rules);

    if (errors.length) {
      setErrors(errors);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
    };

    setIsSavingProfile(true);
    const result = await updateProfile(payload, user?._id);
    if (result?.status) {
      setIsProfileEditable(false);
    }
    setIsSavingProfile(false);
  };

  const onPasswordChange = (e) => {
    if (!e?.target) return;
    const { name, value } = e.target;
    const nextData = { ...passwordFormData, [name]: value };
    setPasswordFormData(nextData);
    if (name === "password" || name === "confirmPassword") {
      setPasswordMatch(nextData.password === nextData.confirmPassword);
    }
  };

  const onPasswordSubmit = async (e) => {
    e.preventDefault();
    removeAllErrors();

    const validationRules = [
      { path: "oldPassword", msg: "Please provide a valid login password." },
      { path: "password", msg: "Please provide a valid password." },
      { path: "confirmPassword", msg: "Please provide a valid password." },
    ];

    const errors = validateForm(passwordFormData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    if (passwordFormData.password !== passwordFormData.confirmPassword) {
      setErrors([{ path: "confirmPassword", msg: "Passwords do not match." }]);
      return;
    }

    const submitData = {};
    Object.keys(passwordFormData).forEach((key) => {
      const value = passwordFormData[key];
      if (value !== "" && value !== null && value !== undefined) {
        submitData[key] = value;
      }
    });

    const result = await changePassword(submitData);
    if (result?.status) {
      setPasswordFormData({
        oldPassword: "",
        password: "",
        confirmPassword: "",
      });
      setPasswordMatch(true);
    }
  };

  const renderTab = (section) => {
    const Icon = section.icon;
    const isActive = activeSection === section.id;

    return (
      <li key={section.id} className="account-tabs__item">
        <button
          type="button"
          className={`account-tabs__btn${isActive ? " is-active" : ""}`}
          onClick={() => selectSection(section.id)}
          disabled={section.disabled}
          aria-current={isActive ? "page" : undefined}
        >
          <Icon aria-hidden />
          <span>{section.shortLabel}</span>
          {section.badge && (
            <span className="account-tabs__badge">{section.badge}</span>
          )}
        </button>
      </li>
    );
  };

  const renderProfileSection = () => (
    <Form onSubmit={onSubmit}>
      <div className="account-field-grid">
        <Form.Group className="account-field account-field--full">
          <Form.Label htmlFor="name" className="form-sub-label">
            Full name
          </Form.Label>
          <Form.Control
            id="name"
            name="name"
            value={formData.name}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="As on your ID or passport"
            disabled={!isProfileEditable}
            className={`text-muted ${
              errorList.name || visibleLocalErrors.name
                ? "form-input-invalid"
                : ""
            }`}
          />
          {visibleLocalErrors.name && (
            <Form.Text className="text-danger">
              {visibleLocalErrors.name}
            </Form.Text>
          )}
          <Errors current_key="name" key="name" />
        </Form.Group>

        <Form.Group className="account-field">
          <Form.Label htmlFor="phone" className="form-sub-label">
            Phone
          </Form.Label>
          <Form.Control
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="+91 …"
            disabled={!isProfileEditable}
            className={`text-muted ${
              errorList.phone || visibleLocalErrors.phone
                ? "form-input-invalid"
                : ""
            }`}
          />
          {visibleLocalErrors.phone && (
            <Form.Text className="text-danger">
              {visibleLocalErrors.phone}
            </Form.Text>
          )}
          <Errors current_key="phone" key="phone" />
        </Form.Group>

        <Form.Group className="account-field">
          <Form.Label htmlFor="email" className="form-sub-label">
            Email
          </Form.Label>
          <Form.Control
            id="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="you@example.com"
            disabled={!isProfileEditable}
            className={`text-muted ${
              errorList.email || visibleLocalErrors.email
                ? "form-input-invalid"
                : ""
            }`}
          />
          {visibleLocalErrors.email && (
            <Form.Text className="text-danger">
              {visibleLocalErrors.email}
            </Form.Text>
          )}
          <Errors current_key="email" key="email" />
        </Form.Group>
      </div>

      <div className="account-actions">
        {!isProfileEditable ? (
          <Button
            type="button"
            className="btn btn--theme"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsProfileEditable(true);
            }}
          >
            Edit Profile
          </Button>
        ) : (
          <>
            <Button
              type="submit"
              className="btn btn--theme"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? "Saving..." : "Save Changes"}
            </Button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                setFormData({
                  name: user?.name || "",
                  phone: user?.phone || "",
                  email: user?.email || "",
                });
                setFieldTouched({});
                setSubmitAttempted(false);
                removeAllErrors();
                setIsProfileEditable(false);
              }}
              disabled={isSavingProfile}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </Form>
  );

  const renderPasswordSection = () => (
    <Form onSubmit={onPasswordSubmit}>
      <div className="account-field-grid">
        <Form.Group className="account-field account-field--full">
          <Form.Label htmlFor="oldPassword" className="form-sub-label">
            Current password
          </Form.Label>
          <InputGroup>
            <Form.Control
              type={showLoginPassword ? "text" : "password"}
              id="oldPassword"
              value={passwordFormData.oldPassword}
              name="oldPassword"
              className={`text-muted ${
                errorList.oldPassword ? "form-input-invalid" : ""
              }`}
              onChange={onPasswordChange}
              placeholder="••••••••"
            />
            <InputGroup.Text
              className="show-password-icon text-muted"
              onClick={() => setShowLoginPassword((prev) => !prev)}
            >
              {showLoginPassword ? (
                <AiOutlineEye size={20} />
              ) : (
                <AiOutlineEyeInvisible size={20} />
              )}
            </InputGroup.Text>
            <Errors current_key="oldPassword" key="oldPassword" />
          </InputGroup>
        </Form.Group>

        <Form.Group className="account-field">
          <Form.Label htmlFor="password" className="form-sub-label">
            New password
          </Form.Label>
          <InputGroup>
            <Form.Control
              type={showPassword ? "text" : "password"}
              id="password"
              value={passwordFormData.password}
              name="password"
              className={`text-muted ${
                errorList.password ? "form-input-invalid" : ""
              }`}
              onChange={onPasswordChange}
              placeholder="••••••••"
            />
            <InputGroup.Text
              className="show-password-icon text-muted"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? (
                <AiOutlineEye size={20} />
              ) : (
                <AiOutlineEyeInvisible size={20} />
              )}
            </InputGroup.Text>
            <Errors current_key="password" key="password" />
          </InputGroup>
        </Form.Group>

        <Form.Group className="account-field">
          <Form.Label htmlFor="confirmPassword" className="form-sub-label">
            Confirm password
          </Form.Label>
          <InputGroup>
            <Form.Control
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              value={passwordFormData.confirmPassword}
              name="confirmPassword"
              className={`text-muted ${
                errorList.confirmPassword || !passwordMatch
                  ? "form-input-invalid"
                  : ""
              }`}
              onChange={onPasswordChange}
              placeholder="••••••••"
              isInvalid={!passwordMatch}
            />
            <InputGroup.Text
              className="show-password-icon text-muted"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? (
                <AiOutlineEye size={20} />
              ) : (
                <AiOutlineEyeInvisible size={20} />
              )}
            </InputGroup.Text>
            <Form.Control.Feedback type="invalid">
              {passwordMatch
                ? "Please provide a valid password."
                : "Passwords do not match."}
            </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>
      </div>

      <div className="account-actions">
        <Button
          type="submit"
          className="btn btn--theme"
          disabled={loadingOnChangePassword}
        >
          {loadingOnChangePassword ? "Saving..." : "Update Password"}
        </Button>
      </div>
    </Form>
  );

  const renderSectionContent = () => {
    if (activeSection === "password") return renderPasswordSection();
    if (activeSection === "addresses") {
      return <AddressBookPanel embedded />;
    }
    return renderProfileSection();
  };

  return (
    <Container className="account-hub-page">
      <AppBreadCrumb
        title="My Account"
        breadcrumbs={[
          { label: "Home", link: "/" },
          { label: "My Account", link: "/user/my-account" },
          { label: activeSectionMeta.shortLabel },
        ]}
      />

      <div className="account-layout">
        <div className="account-user">
          <div className="account-user__avatar" aria-hidden>
            {profileInitial}
          </div>
          <div className="account-user__info">
            <h2 className="account-user__name">{user?.name || "Welcome"}</h2>
            <p className="account-user__email">
              {user?.email || user?.phone || ""}
            </p>
          </div>
        </div>

        <nav aria-label="Account sections">
          <ul className="account-tabs" role="tablist">
            {ACCOUNT_SECTIONS.map((section) => renderTab(section))}
          </ul>
        </nav>

        <section aria-labelledby="account-content-title">
          <div className="account-content__head">
            <h2 id="account-content-title" className="account-content__title">
              {activeSectionMeta.label}
            </h2>
            <p className="account-content__lead">
              {activeSectionMeta.description}
            </p>
          </div>
          {renderSectionContent()}
        </section>
      </div>
    </Container>
  );
};

MyAccount.propTypes = {
  auth: PropTypes.shape({
    user: PropTypes.object,
    loadingOnChangePassword: PropTypes.bool,
  }).isRequired,
  errorList: PropTypes.object.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
  updateProfile: PropTypes.func.isRequired,
  changePassword: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  setErrors,
  removeAllErrors,
  updateProfile,
  changePassword,
})(MyAccount);
