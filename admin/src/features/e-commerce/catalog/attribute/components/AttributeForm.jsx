import { useCallback, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";

const STATUS_OPTIONS = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];

const INPUT_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "boolean", label: "Boolean" },
];

const getStatusOptionByValue = (value) => {
  const normalized = value === true || value === "true";
  return STATUS_OPTIONS.find((item) => item.value === normalized) || null;
};

const getInputTypeOptionByValue = (value) =>
  INPUT_TYPE_OPTIONS.find((item) => item.value === value) || null;

const normalizeOptionValue = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const AttributeForm = ({
  formData,
  onInputChange,
  onFieldBlur,
  localErrors = {},
  attributeSetOptions = [],
}) => {
  const [previewBoolean, setPreviewBoolean] = useState(false);
  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);
  const loadInputTypeOptions = useCallback(() => INPUT_TYPE_OPTIONS, []);
  const loadAttributeSetOptions = useCallback(
    () => attributeSetOptions,
    [attributeSetOptions],
  );

  const handleBlur = (e) => {
    onFieldBlur?.(e.target?.name);
  };

  const selectedAttributeSetOption =
    (attributeSetOptions || []).find(
      (item) => String(item.value) === String(formData.attributeSetId || ""),
    ) || null;
  const optionRows =
    Array.isArray(formData.options) && formData.options.length > 0
      ? formData.options
      : [{ label: "", value: "" }];

  const updateOptionRow = (index, field, value) => {
    const nextOptions = optionRows.map((item, itemIndex) =>
      itemIndex === index
        ? field === "label"
          ? { ...item, label: value, value: normalizeOptionValue(value) }
          : { ...item, [field]: value }
        : item,
    );
    onInputChange({
      target: { name: "options", value: nextOptions },
    });
  };

  const addOptionRow = () => {
    onInputChange({
      target: { name: "options", value: [...optionRows, { label: "", value: "" }] },
    });
  };

  const removeOptionRow = (index) => {
    const nextOptions = optionRows.filter((_, itemIndex) => itemIndex !== index);
    onInputChange({
      target: {
        name: "options",
        value: nextOptions.length ? nextOptions : [{ label: "", value: "" }],
      },
    });
  };

  return (
    <Row className="g-3">
      <Col md={6}>
        <Form.Group>
          <Form.Label>Attribute Set *</Form.Label>
          <CustomSelect
            key={`attribute-set-form-${attributeSetOptions.length}`}
            className="entity-form__select"
            value={selectedAttributeSetOption}
            onChange={(option) =>
              onInputChange({
                target: { name: "attributeSetId", value: option?.value ?? "" },
              })
            }
            loadOptions={loadAttributeSetOptions}
            placeholder="Select attribute set"
            isRequired
          />
          <Errors current_key="attributeSetId" message={localErrors.attributeSetId} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Input Type *</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getInputTypeOptionByValue(formData.inputType)}
            onChange={(option) =>
              onInputChange({
                target: { name: "inputType", value: option?.value ?? "text" },
              })
            }
            loadOptions={loadInputTypeOptions}
            placeholder="Select input type"
            isRequired
          />
          <Errors current_key="inputType" message={localErrors.inputType} />
        </Form.Group>
      </Col>
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
          <Form.Control
            name="code"
            value={formData.code}
            readOnly
            maxLength={120}
          />
          <Errors current_key="code" message={localErrors.code} />
        </Form.Group>
      </Col>
      <Col md={4}>
        <label className="custom-checkbox">
          <input
            type="checkbox"
            name="isRequired"
            checked={Boolean(formData.isRequired)}
            onChange={(e) =>
              onInputChange({
                target: { name: "isRequired", value: e.target.checked },
              })
            }
          />
          <span>Is Required</span>
        </label>
      </Col>
      <Col md={4}>
        <label className="custom-checkbox">
          <input
            type="checkbox"
            name="isFilterable"
            checked={Boolean(formData.isFilterable)}
            onChange={(e) =>
              onInputChange({
                target: { name: "isFilterable", value: e.target.checked },
              })
            }
          />
          <span>Is Filterable</span>
        </label>
      </Col>
      <Col md={4}>
        <label className="custom-checkbox">
          <input
            type="checkbox"
            name="isVariant"
            checked={Boolean(formData.isVariant)}
            onChange={(e) =>
              onInputChange({
                target: { name: "isVariant", value: e.target.checked },
              })
            }
          />
          <span>Is Variant</span>
        </label>
      </Col>
      {formData.inputType === "select" ? (
        <Col md={12}>
          <Form.Group>
            <Form.Label>Options</Form.Label>
            <div className="d-flex flex-column gap-2">
              {optionRows.map((item, index) => (
                <Row key={`option-row-${index}`} className="g-2 align-items-center">
                  <Col md={5}>
                    <Form.Control
                      value={item.label || ""}
                      onChange={(e) => updateOptionRow(index, "label", e.target.value)}
                      placeholder="Option label"
                    />
                  </Col>
                  <Col md={5}>
                    <Form.Control
                      value={item.value || ""}
                      placeholder="Option value"
                      readOnly
                    />
                  </Col>
                  <Col md={2}>
                    <button
                      type="button"
                      className="btn btn--danger btn-sm w-100"
                      onClick={() => removeOptionRow(index)}
                      disabled={optionRows.length === 1}
                    >
                      Remove
                    </button>
                  </Col>
                </Row>
              ))}
              <div>
                <button
                  type="button"
                  className="btn btn--outline btn-sm"
                  onClick={addOptionRow}
                >
                  Add Option
                </button>
              </div>
            </div>
            <Errors current_key="options" message={localErrors.options} />
          </Form.Group>
        </Col>
      ) : null}
      {formData.inputType !== "select" ? (
        <Col md={12}>
          <Form.Group>
            <Form.Label>Preview</Form.Label>
            {formData.inputType === "text" ? (
              <Form.Control type="text" placeholder="Example text input" />
            ) : null}
            {formData.inputType === "number" ? (
              <Form.Control type="number" placeholder="Example number input" />
            ) : null}
            {formData.inputType === "boolean" ? (
              <label className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={previewBoolean}
                  onChange={(e) => setPreviewBoolean(e.target.checked)}
                />
                <span>Example boolean (Yes/No)</span>
              </label>
            ) : null}
          </Form.Group>
        </Col>
      ) : null}
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

export default AttributeForm;
