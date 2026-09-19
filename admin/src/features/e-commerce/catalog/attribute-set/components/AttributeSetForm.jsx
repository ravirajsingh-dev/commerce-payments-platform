import { useCallback } from "react";
import { Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";

const STATUS_OPTIONS = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];

const getStatusOptionByValue = (value) => {
  const normalized = value === true || value === "true";
  return STATUS_OPTIONS.find((item) => item.value === normalized) || null;
};

const AttributeSetForm = ({
  formData,
  onInputChange,
  onFieldBlur,
  localErrors = {},
}) => {
  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);

  const handleBlur = (e) => {
    onFieldBlur?.(e.target?.name);
  };

  return (
    <Row className="g-3">
      <Col md={6}>
        <Form.Group>
          <Form.Label>Name *</Form.Label>
          <Form.Control
            name="name"
            value={formData.name}
            onChange={onInputChange}
            onBlur={handleBlur}
            maxLength={120}
          />
          <Errors current_key="name" message={localErrors.name} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Code *</Form.Label>
          <Form.Control name="code" value={formData.code} readOnly maxLength={140} />
          <Errors current_key="code" message={localErrors.code} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getStatusOptionByValue(formData.isActive)}
            onChange={(option) =>
              onInputChange({
                target: { name: "isActive", value: option?.value ?? true },
              })
            }
            loadOptions={loadStatusOptions}
            placeholder="Select status"
            isRequired
          />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default AttributeSetForm;
