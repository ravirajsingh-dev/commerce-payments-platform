import { useCallback, useEffect, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import CustomSelect from "@src/components/common/CustomSelect";

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const getStatusOption = (value) =>
  STATUS_OPTIONS.find((item) => String(item.value) === String(value)) ||
  STATUS_OPTIONS[0];

const HomeSliderForm = ({
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
  const previewSrc =
    objectUrl || (isEditMode && existingImageUrl ? existingImageUrl : "");

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
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getStatusOption(formData.status)}
            onChange={(option) =>
              onInputChange({
                target: { name: "status", value: option?.value ?? "true" },
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
          <Form.Label>Short Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            name="shortDesc"
            value={formData.shortDesc}
            onChange={onInputChange}
          />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Button Text</Form.Label>
          <Form.Control
            name="buttonText"
            value={formData.buttonText}
            onChange={onInputChange}
          />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Button Link</Form.Label>
          <Form.Control
            name="buttonLink"
            value={formData.buttonLink}
            onChange={onInputChange}
          />
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

export default HomeSliderForm;
