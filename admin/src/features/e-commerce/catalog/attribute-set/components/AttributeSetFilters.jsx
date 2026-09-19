import { useCallback, useMemo } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import { isValidName, sanitizeName } from "@src/utils/inputValidation";

const STATUS_OPTIONS = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];

const getStatusOptionByValue = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = value === true || value === "true";
  return STATUS_OPTIONS.find((item) => item.value === normalized) || null;
};

const AttributeSetFilters = ({ values, onChange, onSearch, onReset }) => {
  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);

  const handleNameChange = (e) => {
    const nextValue = sanitizeName(e.target.value);
    onChange({ target: { name: "name", value: nextValue } });
  };

  const filterErrors = useMemo(() => {
    const errors = {};
    if (values.name?.trim() && !isValidName(values.name)) {
      errors.name = "Name must be 3-50 characters and in valid format.";
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
                  <Form.Text className="form-error-message">
                    {filterErrors.name}
                  </Form.Text>
                ) : null}
              </div>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getStatusOptionByValue(values.status)}
                onChange={(option) =>
                  onChange({
                    target: { name: "status", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadStatusOptions}
                placeholder="All statuses"
              />
            </Form.Group>
          </Col>
          <Col xs={12} className="d-flex justify-content-end gap-2 mt-3">
            <Button
              type="button"
              className="btn btn--outline"
              onClick={onReset}
            >
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

export default AttributeSetFilters;
