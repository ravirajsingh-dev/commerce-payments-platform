import { useCallback } from "react";
import { Col, Form, Row } from "react-bootstrap";
import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const getStatusOption = (value) =>
  STATUS_OPTIONS.find((item) => String(item.value) === String(value)) ||
  STATUS_OPTIONS[0];

const ShowcaseForm = ({
  formData,
  onInputChange,
  localErrors = {},
}) => {
  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);

  return (
    <Row className="g-3">
      <Col md={6}>
        <Form.Group>
          <Form.Label>Heading *</Form.Label>
          <Form.Control
            name="heading"
            value={formData.heading}
            onChange={onInputChange}
            required
          />
          <Errors current_key="heading" message={localErrors.heading} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getStatusOption(formData.isActive)}
            onChange={(option) =>
              onInputChange({
                target: { name: "isActive", value: option?.value ?? "true" },
              })
            }
            loadOptions={loadStatusOptions}
            placeholder="Select status"
            isRequired
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Description *</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            name="description"
            value={formData.description}
            onChange={onInputChange}
            required
          />
          <Errors current_key="description" message={localErrors.description} />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default ShowcaseForm;
