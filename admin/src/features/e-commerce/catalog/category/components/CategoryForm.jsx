import { useCallback } from "react";
import { Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";

const STATUS_OPTIONS = [
  { value: 1, label: "Active" },
  { value: 2, label: "Inactive" },
];

const getStatusOptionByValue = (value) =>
  STATUS_OPTIONS.find((item) => Number(item.value) === Number(value)) || null;

const CategoryForm = ({
  formData,
  onInputChange,
  onFieldBlur,
  localErrors = {},
  parentCategoryOptions = [],
  currentCategoryId = null,
}) => {
  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);
  const loadParentCategoryOptions = useCallback(
    () =>
      (parentCategoryOptions || []).filter(
        (item) => String(item.value) !== String(currentCategoryId || ""),
      ),
    [parentCategoryOptions, currentCategoryId],
  );

  const handleBlur = (e) => {
    onFieldBlur?.(e.target?.name);
  };

  const selectedParentOption =
    (parentCategoryOptions || []).find(
      (item) => String(item.value) === String(formData.parentCategoryId || ""),
    ) || null;

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
          <Form.Label>Slug *</Form.Label>
          <Form.Control
            name="slug"
            value={formData.slug}
            readOnly
            maxLength={140}
          />
          <Errors current_key="slug" message={localErrors.slug} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Parent Category</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={selectedParentOption}
            onChange={(option) =>
              onInputChange({
                target: {
                  name: "parentCategoryId",
                  value: option?.value ?? "",
                },
              })
            }
            loadOptions={loadParentCategoryOptions}
            placeholder="Select parent category"
            isClearable
          />
          <Errors
            current_key="parentCategoryId"
            message={localErrors.parentCategoryId}
          />
        </Form.Group>
      </Col>
      <Col md={3}>
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getStatusOptionByValue(formData.status)}
            onChange={(option) =>
              onInputChange({
                target: { name: "status", value: option?.value ?? 1 },
              })
            }
            loadOptions={loadStatusOptions}
            placeholder="Select status"
            isRequired
          />
        </Form.Group>
      </Col>
      <Col md={3}>
        <Form.Group>
          <Form.Label>Sort Order</Form.Label>
          <Form.Control
            name="sortOrder"
            type="number"
            min={0}
            step={1}
            value={formData.sortOrder}
            onChange={onInputChange}
            onBlur={handleBlur}
          />
          <Errors current_key="sortOrder" message={localErrors.sortOrder} />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default CategoryForm;
