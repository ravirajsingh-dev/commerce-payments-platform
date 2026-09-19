import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import UserFormFields from "@src/features/users/UserFormFields";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import { validateForm } from "@src/utils/validation";
import {
  getContactValidationRules,
  isValidEmail,
  isValidName,
  isValidPhone,
  PASSWORD_MIN_LENGTH,
  passwordMinRule,
  sanitizeEmail,
  sanitizeName,
  sanitizePhone,
} from "@src/utils/inputValidation";
import { createUser } from "@src/features/users/userActions";

const initialFormState = {
  name: "",
  phone: "",
  email: "",
  password: "",
  status: 1,
};

const CreateUser = ({ createUser, setErrors, removeErrors, usersStore }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { loadingSubmit } = usersStore;

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

  const validationErrors = useMemo(() => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Please enter valid name.";
    else if (!isValidName(formData.name))
      errors.name =
        "Name must be 3-50 characters and must not contain unsafe content.";

    if (!formData.phone.trim())
      errors.phone = "Please enter valid phone number.";
    else if (!isValidPhone(formData.phone))
      errors.phone = "Phone must be exactly 10 digits.";

    if (!formData.email.trim())
      errors.email = "Please enter valid email address.";
    else if (!isValidEmail(formData.email))
      errors.email = "Please enter a valid email format.";

    if (
      !formData.password.trim() ||
      formData.password.trim().length < PASSWORD_MIN_LENGTH
    ) {
      errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    return errors;
  }, [formData]);

  const visibleLocalErrors = useMemo(() => {
    const next = {};
    Object.entries(validationErrors).forEach(([key, msg]) => {
      if (fieldTouched[key] || submitAttempted) next[key] = msg;
    });
    return next;
  }, [validationErrors, fieldTouched, submitAttempted]);

  const isFormValid = Object.keys(validationErrors).length === 0;

  const markFieldTouched = (name) => {
    if (!name) return;
    setFieldTouched((prev) => ({ ...prev, [name]: true }));
  };

  const onInputChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === "phone") {
      nextValue = sanitizePhone(value);
    } else if (name === "email") {
      nextValue = sanitizeEmail(value);
    } else if (name === "name") {
      nextValue = sanitizeName(value);
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const rules = [
      ...getContactValidationRules(),
      passwordMinRule("password", PASSWORD_MIN_LENGTH),
    ];

    const errors = validateForm(formData, rules);
    if (errors.length) {
      setSubmitAttempted(true);
      setErrors(errors);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      password: formData.password.trim(),
      status: Number(formData.status) || 1,
    };

    const result = await createUser(payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/users");
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Users", link: "/admin/users" },
          { label: "Create User" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Create User</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <UserFormFields
              formData={formData}
              onInputChange={onInputChange}
              onFieldBlur={markFieldTouched}
              localErrors={visibleLocalErrors}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/admin/users")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loadingSubmit || !isFormValid}
              >
                {loadingSubmit ? "Saving..." : "Create User"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  usersStore: state.users,
});

export default connect(mapStateToProps, {
  createUser,
  setErrors,
  removeErrors,
})(CreateUser);
