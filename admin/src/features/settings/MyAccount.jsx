import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import {
  Button,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
  Tab,
  Tabs,
} from "react-bootstrap";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import {
  emailRule,
  isValidName,
  requiredRule,
  sanitizeEmail,
  sanitizeName,
  sanitizePhone,
  phoneRule,
} from "@src/utils/inputValidation";
import {
  changePassword,
  changeTxnPassword,
  removeAllErrors,
  setErrors,
  setTxnPassword,
} from "@src/features/auth/authActions";
import { getMyProfile, updateMyProfile } from "@src/features/settings/profileActions";

const initialFormData = {
  name: "",
  phone: "",
  email: "",
};

const initialLoginPasswordForm = {
  oldPassword: "",
  password: "",
  confirmPassword: "",
};

const initialTxnPasswordForm = {
  currentTxnPassword: "",
  newTxnPassword: "",
  confirmTxnPassword: "",
};

const initialSetTxnForm = {
  txn_password: "",
  confirmTxnPassword: "",
};

const MyAccount = ({
  auth,
  errorList,
  setErrors,
  removeAllErrors,
  getMyProfile,
  updateMyProfile,
  changePassword,
  changeTxnPassword,
  setTxnPassword,
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isProfileEditable, setIsProfileEditable] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [loginPasswordForm, setLoginPasswordForm] = useState(initialLoginPasswordForm);
  const [txnPasswordForm, setTxnPasswordForm] = useState(initialTxnPasswordForm);
  const [setTxnForm, setSetTxnForm] = useState(initialSetTxnForm);
  const [isTxnSet, setIsTxnSet] = useState(false);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentTxnPassword, setShowCurrentTxnPassword] = useState(false);
  const [showNewTxnPassword, setShowNewTxnPassword] = useState(false);
  const [showConfirmTxnPassword, setShowConfirmTxnPassword] = useState(false);
  const [showSetTxnPassword, setShowSetTxnPassword] = useState(false);
  const [showSetTxnConfirmPassword, setShowSetTxnConfirmPassword] = useState(false);

  const loadingOnChangePassword = auth?.loadingOnChangePassword;

  useEffect(() => {
    removeAllErrors();
  }, [removeAllErrors]);

  useEffect(() => {
    const run = async () => {
      const result = await getMyProfile();
      if (result?.status && result?.data) {
        setFormData({
          name: result.data.name || "",
          phone: result.data.phone || "",
          email: result.data.email || "",
        });
        setIsTxnSet(Boolean(result.data.txn_password) || Boolean(auth?.user?.isTxnPassSet));
      } else {
        setIsTxnSet(Boolean(auth?.user?.isTxnPassSet));
      }
      setFieldTouched({});
      setSubmitAttempted(false);
      setIsProfileEditable(false);
    };

    run();
  }, [getMyProfile, auth?.user?.isTxnPassSet]);

  const localValidationErrors = useMemo(() => {
    const errors = {};
    const rules = [
      requiredRule("name", "Please enter valid name."),
      requiredRule("phone", "Please enter valid phone number."),
      requiredRule("email", "Please enter valid email address."),
      phoneRule("phone"),
      emailRule("email"),
      {
        path: "name",
        validator: (value) => isValidName(value, { min: 3, max: 20 }),
        msg: "Name must be 3-20 characters and must not contain unsafe content.",
      },
    ];
    const validationErrors = validateForm(formData, rules);
    validationErrors.forEach((error) => {
      errors[error.path] = error.msg;
    });
    return errors;
  }, [formData]);

  const visibleLocalErrors = useMemo(() => {
    const errors = {};
    Object.entries(localValidationErrors).forEach(([path, msg]) => {
      if (fieldTouched[path] || submitAttempted) errors[path] = msg;
    });
    return errors;
  }, [fieldTouched, localValidationErrors, submitAttempted]);

  const activeTabLabel = useMemo(() => {
    if (activeTab === "login-password") return "Change Login Password";
    if (activeTab === "txn-password") return "Change Transaction Password";
    return "Profile";
  }, [activeTab]);

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

  const onProfileSubmit = async (e) => {
    e.preventDefault();
    const submitIntent =
      e?.nativeEvent?.submitter?.getAttribute("data-submit-intent") || "";
    if (submitIntent !== "save-profile") return;
    if (!isProfileEditable) return;
    removeAllErrors();
    setSubmitAttempted(true);
    const errors = validateForm(formData, [
      requiredRule("name", "Please enter valid name."),
      requiredRule("phone", "Please enter valid phone number."),
      requiredRule("email", "Please enter valid email address."),
      phoneRule("phone"),
      emailRule("email"),
      {
        path: "name",
        validator: (value) => isValidName(value, { min: 3, max: 20 }),
        msg: "Name must be 3-20 characters and must not contain unsafe content.",
      },
    ]);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    setIsSavingProfile(true);
    const result = await updateMyProfile({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
    });
    if (result?.status) {
      setIsProfileEditable(false);
    }
    setIsSavingProfile(false);
  };

  const onLoginPasswordSubmit = async (e) => {
    e.preventDefault();
    removeAllErrors();
    const errors = validateForm(loginPasswordForm, [
      { path: "oldPassword", msg: "Please provide a valid login password." },
      { path: "password", msg: "Please provide a valid password." },
      { path: "confirmPassword", msg: "Please provide a valid password." },
    ]);
    if (errors.length) {
      setErrors(errors);
      return;
    }
    if (loginPasswordForm.password !== loginPasswordForm.confirmPassword) {
      setErrors([{ path: "confirmPassword", msg: "Passwords do not match." }]);
      return;
    }

    await changePassword(loginPasswordForm);
    setLoginPasswordForm(initialLoginPasswordForm);
  };

  const onTxnPasswordSubmit = async (e) => {
    e.preventDefault();
    removeAllErrors();

    if (!isTxnSet) {
      const setErrorsList = validateForm(setTxnForm, [
        { path: "txn_password", msg: "Please provide a valid transaction password." },
        { path: "confirmTxnPassword", msg: "Please provide a valid transaction password." },
      ]);
      if (setErrorsList.length) {
        setErrors(setErrorsList);
        return;
      }
      if (setTxnForm.txn_password !== setTxnForm.confirmTxnPassword) {
        setErrors([
          {
            path: "confirmTxnPassword",
            msg: "Transaction passwords do not match.",
          },
        ]);
        return;
      }

      await setTxnPassword({ txn_password: setTxnForm.txn_password });
      setIsTxnSet(true);
      setSetTxnForm(initialSetTxnForm);
      return;
    }

    const errors = validateForm(txnPasswordForm, [
      { path: "currentTxnPassword", msg: "Please provide a valid transaction password." },
      { path: "newTxnPassword", msg: "Please provide a valid transaction password." },
      { path: "confirmTxnPassword", msg: "Please provide a valid transaction password." },
    ]);
    if (errors.length) {
      setErrors(errors);
      return;
    }
    if (txnPasswordForm.newTxnPassword !== txnPasswordForm.confirmTxnPassword) {
      setErrors([
        {
          path: "confirmTxnPassword",
          msg: "Transaction passwords do not match.",
        },
      ]);
      return;
    }
    await changeTxnPassword(txnPasswordForm);
    setTxnPasswordForm(initialTxnPasswordForm);
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "My Account", link: "/admin/my-account" },
          { label: activeTabLabel },
        ]}
      />

      <Row className="justify-content-center p-2">
        <Col xs={12} sm={10} md={8} lg={7}>
          <div className="common-form-card user-profile-card">
            <Row>
              <Col className="custom-heading-theam">My Account</Col>
            </Row>

            <Tabs
              activeKey={activeTab}
              onSelect={(tabKey) => {
                setActiveTab(tabKey || "profile");
                removeAllErrors();
              }}
              className="mb-3 user-profile-tabs"
            >
              <Tab eventKey="profile" title="Profile">
                <Form onSubmit={onProfileSubmit}>
                  <Row className="mb-3">
                    <Form.Group as={Col} md="12">
                      <Form.Label htmlFor="name" className="form-sub-label">
                        Name
                      </Form.Label>
                      <Form.Control
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder="Enter your name"
                        disabled={!isProfileEditable}
                        maxLength={20}
                        className={`text-muted ${
                          errorList.name || visibleLocalErrors.name ? "form-input-invalid" : ""
                        }`}
                      />
                      {visibleLocalErrors.name && (
                        <Form.Text className="text-danger">{visibleLocalErrors.name}</Form.Text>
                      )}
                      <Errors current_key="name" />
                    </Form.Group>
                  </Row>

                  <Row className="mb-3">
                    <Form.Group as={Col} md="12">
                      <Form.Label htmlFor="phone" className="form-sub-label">
                        Phone
                      </Form.Label>
                      <Form.Control
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder="Enter your phone number"
                        disabled={!isProfileEditable}
                        className={`text-muted ${
                          errorList.phone || visibleLocalErrors.phone ? "form-input-invalid" : ""
                        }`}
                      />
                      {visibleLocalErrors.phone && (
                        <Form.Text className="text-danger">{visibleLocalErrors.phone}</Form.Text>
                      )}
                      <Errors current_key="phone" />
                    </Form.Group>
                  </Row>

                  <Row className="mb-3">
                    <Form.Group as={Col} md="12">
                      <Form.Label htmlFor="email" className="form-sub-label">
                        Email
                      </Form.Label>
                      <Form.Control
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder="Enter your email"
                        disabled={!isProfileEditable}
                        className={`text-muted ${
                          errorList.email || visibleLocalErrors.email ? "form-input-invalid" : ""
                        }`}
                      />
                      {visibleLocalErrors.email && (
                        <Form.Text className="text-danger">{visibleLocalErrors.email}</Form.Text>
                      )}
                      <Errors current_key="email" />
                    </Form.Group>
                  </Row>

                  <Row>
                    <Col className="d-flex justify-content-center gap-2 mt-2">
                      {!isProfileEditable ? (
                        <Button
                          key="edit-profile-btn"
                          type="button"
                          data-submit-intent="edit-profile"
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
                            key="save-profile-btn"
                            type="submit"
                            data-submit-intent="save-profile"
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
                                name: auth?.user?.name || "",
                                phone: auth?.user?.phone || "",
                                email: auth?.user?.email || "",
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
                    </Col>
                  </Row>
                </Form>
              </Tab>

              <Tab eventKey="login-password" title="Change Login Password">
                <Form onSubmit={onLoginPasswordSubmit}>
                  <Row className="mb-3">
                    <Form.Group as={Col} md="12">
                      <Form.Label htmlFor="oldPassword" className="form-sub-label">
                        Current password
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showOldPassword ? "text" : "password"}
                          id="oldPassword"
                          value={loginPasswordForm.oldPassword}
                          name="oldPassword"
                          className={`text-muted ${
                            errorList.oldPassword ? "form-input-invalid" : ""
                          }`}
                          onChange={(e) =>
                            setLoginPasswordForm((prev) => ({
                              ...prev,
                              oldPassword: e.target.value,
                            }))
                          }
                          placeholder="Enter current password"
                        />
                        <InputGroup.Text
                          className="show-password-icon text-muted"
                          onClick={() => setShowOldPassword((prev) => !prev)}
                        >
                          {showOldPassword ? <AiOutlineEye size={20} /> : <AiOutlineEyeInvisible size={20} />}
                        </InputGroup.Text>
                        <Errors current_key="oldPassword" />
                      </InputGroup>
                    </Form.Group>
                  </Row>

                  <Row className="mb-3">
                    <Form.Group as={Col} md="12">
                      <Form.Label htmlFor="password" className="form-sub-label">
                        New password
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showNewPassword ? "text" : "password"}
                          id="password"
                          value={loginPasswordForm.password}
                          name="password"
                          className={`text-muted ${
                            errorList.password ? "form-input-invalid" : ""
                          }`}
                          onChange={(e) =>
                            setLoginPasswordForm((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          placeholder="Enter new password"
                        />
                        <InputGroup.Text
                          className="show-password-icon text-muted"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                        >
                          {showNewPassword ? <AiOutlineEye size={20} /> : <AiOutlineEyeInvisible size={20} />}
                        </InputGroup.Text>
                        <Errors current_key="password" />
                      </InputGroup>
                    </Form.Group>
                  </Row>

                  <Row className="mb-3">
                    <Form.Group as={Col} md="12">
                      <Form.Label htmlFor="confirmPassword" className="form-sub-label">
                        Confirm password
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showConfirmPassword ? "text" : "password"}
                          id="confirmPassword"
                          value={loginPasswordForm.confirmPassword}
                          name="confirmPassword"
                          className={`text-muted ${
                            errorList.confirmPassword ? "form-input-invalid" : ""
                          }`}
                          onChange={(e) =>
                            setLoginPasswordForm((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          placeholder="Confirm new password"
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
                        <Errors current_key="confirmPassword" />
                      </InputGroup>
                    </Form.Group>
                  </Row>

                  <Row>
                    <Col className="d-flex justify-content-center mt-2">
                      <Button
                        type="submit"
                        className="btn btn--theme"
                        disabled={loadingOnChangePassword}
                      >
                        {loadingOnChangePassword ? "Saving..." : "Save Password"}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Tab>

              <Tab eventKey="txn-password" title="Change Transaction Password">
                <Form onSubmit={onTxnPasswordSubmit}>
                  {isTxnSet ? (
                    <>
                      <Row className="mb-3">
                        <Form.Group as={Col} md="12">
                          <Form.Label htmlFor="currentTxnPassword" className="form-sub-label">
                            Current transaction password
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={showCurrentTxnPassword ? "text" : "password"}
                              id="currentTxnPassword"
                              value={txnPasswordForm.currentTxnPassword}
                              name="currentTxnPassword"
                              className={`text-muted ${
                                errorList.currentTxnPassword ? "form-input-invalid" : ""
                              }`}
                              onChange={(e) =>
                                setTxnPasswordForm((prev) => ({
                                  ...prev,
                                  currentTxnPassword: e.target.value,
                                }))
                              }
                              placeholder="Enter current transaction password"
                            />
                            <InputGroup.Text
                              className="show-password-icon text-muted"
                              onClick={() => setShowCurrentTxnPassword((prev) => !prev)}
                            >
                              {showCurrentTxnPassword ? (
                                <AiOutlineEye size={20} />
                              ) : (
                                <AiOutlineEyeInvisible size={20} />
                              )}
                            </InputGroup.Text>
                            <Errors current_key="currentTxnPassword" />
                          </InputGroup>
                        </Form.Group>
                      </Row>

                      <Row className="mb-3">
                        <Form.Group as={Col} md="12">
                          <Form.Label htmlFor="newTxnPassword" className="form-sub-label">
                            New transaction password
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={showNewTxnPassword ? "text" : "password"}
                              id="newTxnPassword"
                              value={txnPasswordForm.newTxnPassword}
                              name="newTxnPassword"
                              className={`text-muted ${
                                errorList.newTxnPassword ? "form-input-invalid" : ""
                              }`}
                              onChange={(e) =>
                                setTxnPasswordForm((prev) => ({
                                  ...prev,
                                  newTxnPassword: e.target.value,
                                }))
                              }
                              placeholder="Enter new transaction password"
                            />
                            <InputGroup.Text
                              className="show-password-icon text-muted"
                              onClick={() => setShowNewTxnPassword((prev) => !prev)}
                            >
                              {showNewTxnPassword ? (
                                <AiOutlineEye size={20} />
                              ) : (
                                <AiOutlineEyeInvisible size={20} />
                              )}
                            </InputGroup.Text>
                            <Errors current_key="newTxnPassword" />
                          </InputGroup>
                        </Form.Group>
                      </Row>

                      <Row className="mb-3">
                        <Form.Group as={Col} md="12">
                          <Form.Label htmlFor="confirmTxnPassword" className="form-sub-label">
                            Confirm transaction password
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={showConfirmTxnPassword ? "text" : "password"}
                              id="confirmTxnPassword"
                              value={txnPasswordForm.confirmTxnPassword}
                              name="confirmTxnPassword"
                              className={`text-muted ${
                                errorList.confirmTxnPassword ? "form-input-invalid" : ""
                              }`}
                              onChange={(e) =>
                                setTxnPasswordForm((prev) => ({
                                  ...prev,
                                  confirmTxnPassword: e.target.value,
                                }))
                              }
                              placeholder="Confirm new transaction password"
                            />
                            <InputGroup.Text
                              className="show-password-icon text-muted"
                              onClick={() => setShowConfirmTxnPassword((prev) => !prev)}
                            >
                              {showConfirmTxnPassword ? (
                                <AiOutlineEye size={20} />
                              ) : (
                                <AiOutlineEyeInvisible size={20} />
                              )}
                            </InputGroup.Text>
                            <Errors current_key="confirmTxnPassword" />
                          </InputGroup>
                        </Form.Group>
                      </Row>
                    </>
                  ) : (
                    <>
                      <Row className="mb-3">
                        <Form.Group as={Col} md="12">
                          <Form.Label htmlFor="txn_password" className="form-sub-label">
                            Set transaction password
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={showSetTxnPassword ? "text" : "password"}
                              id="txn_password"
                              value={setTxnForm.txn_password}
                              name="txn_password"
                              className={`text-muted ${
                                errorList.txn_password ? "form-input-invalid" : ""
                              }`}
                              onChange={(e) =>
                                setSetTxnForm((prev) => ({
                                  ...prev,
                                  txn_password: e.target.value,
                                }))
                              }
                              placeholder="Enter transaction password"
                            />
                            <InputGroup.Text
                              className="show-password-icon text-muted"
                              onClick={() => setShowSetTxnPassword((prev) => !prev)}
                            >
                              {showSetTxnPassword ? <AiOutlineEye size={20} /> : <AiOutlineEyeInvisible size={20} />}
                            </InputGroup.Text>
                            <Errors current_key="txn_password" />
                          </InputGroup>
                        </Form.Group>
                      </Row>

                      <Row className="mb-3">
                        <Form.Group as={Col} md="12">
                          <Form.Label htmlFor="setConfirmTxnPassword" className="form-sub-label">
                            Confirm transaction password
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={showSetTxnConfirmPassword ? "text" : "password"}
                              id="setConfirmTxnPassword"
                              value={setTxnForm.confirmTxnPassword}
                              name="confirmTxnPassword"
                              className={`text-muted ${
                                errorList.confirmTxnPassword ? "form-input-invalid" : ""
                              }`}
                              onChange={(e) =>
                                setSetTxnForm((prev) => ({
                                  ...prev,
                                  confirmTxnPassword: e.target.value,
                                }))
                              }
                              placeholder="Confirm transaction password"
                            />
                            <InputGroup.Text
                              className="show-password-icon text-muted"
                              onClick={() => setShowSetTxnConfirmPassword((prev) => !prev)}
                            >
                              {showSetTxnConfirmPassword ? (
                                <AiOutlineEye size={20} />
                              ) : (
                                <AiOutlineEyeInvisible size={20} />
                              )}
                            </InputGroup.Text>
                            <Errors current_key="confirmTxnPassword" />
                          </InputGroup>
                        </Form.Group>
                      </Row>
                    </>
                  )}

                  <Row>
                    <Col className="d-flex justify-content-center mt-2">
                      <Button
                        type="submit"
                        className="btn btn--theme"
                        disabled={loadingOnChangePassword}
                      >
                        {loadingOnChangePassword
                          ? "Saving..."
                          : isTxnSet
                            ? "Save Transaction Password"
                            : "Set Transaction Password"}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Tab>
            </Tabs>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

MyAccount.propTypes = {
  auth: PropTypes.object.isRequired,
  errorList: PropTypes.object.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
  getMyProfile: PropTypes.func.isRequired,
  updateMyProfile: PropTypes.func.isRequired,
  changePassword: PropTypes.func.isRequired,
  changeTxnPassword: PropTypes.func.isRequired,
  setTxnPassword: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  setErrors,
  removeAllErrors,
  getMyProfile,
  updateMyProfile,
  changePassword,
  changeTxnPassword,
  setTxnPassword,
})(MyAccount);
