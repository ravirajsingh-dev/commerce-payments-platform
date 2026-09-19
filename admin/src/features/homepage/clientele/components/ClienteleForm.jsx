import { useCallback, useEffect, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import CustomSelect from "@src/components/common/CustomSelect";

const NOTE_MAX_LENGTH = 300;

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const getStatusOption = (value) =>
  STATUS_OPTIONS.find((item) => String(item.value) === String(value)) ||
  STATUS_OPTIONS[0];

const ClienteleForm = ({
  formData,
  onInputChange,
  isEditMode = false,
  existingImageUrl = "",
}) => {
  const [objectUrl, setObjectUrl] = useState("");
  useEffect(() => {
    if (formData.image instanceof File) {
      const u = URL.createObjectURL(formData.image);
      setObjectUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setObjectUrl("");
    return undefined;
  }, [formData.image]);

  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);
  const noteValue = String(formData.note || "").slice(0, NOTE_MAX_LENGTH);

  const previewSrc =
    objectUrl || (isEditMode && existingImageUrl ? existingImageUrl : "");

  return (
    <Row className="g-3">
      <Col md={12}>
        <Form.Group>
          <Form.Label>Client Name *</Form.Label>
          <Form.Control
            name="name"
            value={formData.name}
            onChange={onInputChange}
            required
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Note</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            name="note"
            value={noteValue}
            onChange={onInputChange}
            maxLength={NOTE_MAX_LENGTH}
          />
          <Form.Text className="text-muted">
            {noteValue.length}/{NOTE_MAX_LENGTH} characters
          </Form.Text>
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Image {!isEditMode && "*"}</Form.Label>
          <Form.Control
            type="file"
            name="image"
            onChange={onInputChange}
            accept="image/*"
          />
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
      {previewSrc ? (
        <Col xs={12}>
          <div className="border rounded p-2 d-inline-block bg-light">
            <img
              src={previewSrc}
              alt=""
              className="d-block"
              style={{
                maxHeight: "200px",
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </Col>
      ) : null}
    </Row>
  );
};

export default ClienteleForm;
