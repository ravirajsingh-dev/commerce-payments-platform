import { useMemo } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import {
  isValidEmail,
  isValidName,
  sanitizeEmail,
  sanitizeName,
  sanitizePhone,
} from "@src/utils/inputValidation";

const BespokeAppointmentFilters = ({ values, onChange, onSearch, onReset }) => {
  const handleNameChange = (e) => {
    onChange({ target: { name: "name", value: sanitizeName(e.target.value) } });
  };

  const handlePhoneChange = (e) => {
    onChange({ target: { name: "phone", value: sanitizePhone(e.target.value) } });
  };

  const handleEmailChange = (e) => {
    onChange({ target: { name: "email", value: sanitizeEmail(e.target.value) } });
  };

  const filterErrors = useMemo(() => {
    const errors = {};
    if (values.name?.trim() && !isValidName(values.name)) {
      errors.name = "Name must be 3-50 characters and in valid format.";
    }
    if (
      values.phone?.trim() &&
      values.phone.trim().length > 0 &&
      values.phone.trim().length < 10
    ) {
      errors.phone = "Phone must be exactly 10 digits.";
    }
    if (values.email?.trim() && !isValidEmail(values.email)) {
      errors.email = "Please enter a valid email format.";
    }
    if (values.fromDate && values.toDate && values.fromDate > values.toDate) {
      errors.toDate = "To Date must be greater than or equal to From Date.";
    }
    return errors;
  }, [values]);

  const isFilterValid = Object.keys(filterErrors).length === 0;

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3 align-items-end">
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>Name</Form.Label>
              <Form.Control
                name="name"
                value={values.name}
                onChange={handleNameChange}
                placeholder="Filter by name"
                maxLength={50}
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.name ? (
                  <Form.Text className="form-error-message">{filterErrors.name}</Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>Phone</Form.Label>
              <Form.Control
                name="phone"
                value={values.phone}
                onChange={handlePhoneChange}
                placeholder="Filter by phone"
                inputMode="numeric"
                maxLength={10}
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.phone ? (
                  <Form.Text className="form-error-message">{filterErrors.phone}</Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>Email</Form.Label>
              <Form.Control
                name="email"
                value={values.email}
                onChange={handleEmailChange}
                placeholder="Filter by email"
                type="email"
                maxLength={254}
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.email ? (
                  <Form.Text className="form-error-message">{filterErrors.email}</Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>Service</Form.Label>
              <Form.Control
                name="service"
                value={values.service}
                onChange={onChange}
                placeholder="Filter by service"
                maxLength={120}
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                name="fromDate"
                value={values.fromDate}
                onChange={onChange}
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>To Date</Form.Label>
              <Form.Control
                type="date"
                name="toDate"
                value={values.toDate}
                onChange={onChange}
              />
              <div className="form-field-feedback" aria-live="polite">
                {filterErrors.toDate ? (
                  <Form.Text className="form-error-message">{filterErrors.toDate}</Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col xs={12} className="d-flex justify-content-end gap-2 mt-3">
            <Button type="button" className="btn btn--outline" onClick={onReset}>
              Reset
            </Button>
            <Button
              type="button"
              className="btn btn--theme btn--disabled-theme"
              onClick={onSearch}
              disabled={!isFilterValid}
            >
              Search
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default BespokeAppointmentFilters;
