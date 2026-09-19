import { useCallback } from "react";
import { Col, Form, Row } from "react-bootstrap";
import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";

const STATUS_OPTIONS = [
  { value: 1, label: "Active" },
  { value: 2, label: "Inactive" },
];

const COLUMN_OPTIONS = [
  { value: 0, label: "Column 1 (left)" },
  { value: 1, label: "Column 2 (center)" },
  { value: 2, label: "Column 3 (right)" },
];

const getStatusOption = (value) =>
  STATUS_OPTIONS.find((item) => Number(item.value) === Number(value)) || null;

const getColumnOption = (value) =>
  COLUMN_OPTIONS.find((item) => Number(item.value) === Number(value)) ||
  COLUMN_OPTIONS[0];

const StoreNavSectionForm = ({
  formData,
  onInputChange,
  onFieldBlur,
  localErrors = {},
  productOptions = [],
}) => {
  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);
  const loadColumnOptions = useCallback(() => COLUMN_OPTIONS, []);
  const loadProductOptions = useCallback(() => productOptions, [productOptions]);

  const selectedProducts = (productOptions || []).filter((item) =>
    (formData.productIds || []).map(String).includes(String(item.value)),
  );

  const handleBlur = (e) => {
    onFieldBlur?.(e.target?.name);
  };

  return (
    <Row className="g-3">
      <Col md={6}>
        <Form.Group>
          <Form.Label>Menu heading *</Form.Label>
          <Form.Control
            name="title"
            value={formData.title}
            onChange={onInputChange}
            onBlur={handleBlur}
            placeholder="e.g. SHOP BY COLLECTION"
            maxLength={120}
          />
          <Errors current_key="title" message={localErrors.title} />
        </Form.Group>
      </Col>
      <Col md={3}>
        <Form.Group>
          <Form.Label>Mega-menu column *</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getColumnOption(formData.columnIndex)}
            onChange={(option) =>
              onInputChange({
                target: {
                  name: "columnIndex",
                  value: option?.value ?? 0,
                },
              })
            }
            loadOptions={loadColumnOptions}
            placeholder="Select column"
          />
          <Errors current_key="columnIndex" message={localErrors.columnIndex} />
        </Form.Group>
      </Col>
      <Col md={3}>
        <Form.Group>
          <Form.Label>Sort order</Form.Label>
          <Form.Control
            type="number"
            name="sortOrder"
            min={0}
            value={formData.sortOrder}
            onChange={onInputChange}
            onBlur={handleBlur}
          />
          <Errors current_key="sortOrder" message={localErrors.sortOrder} />
        </Form.Group>
      </Col>
      <Col md={4}>
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getStatusOption(formData.status)}
            onChange={(option) =>
              onInputChange({
                target: { name: "status", value: option?.value ?? 1 },
              })
            }
            loadOptions={loadStatusOptions}
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Products in this section</Form.Label>
          <CustomSelect
            key={`store-nav-products-${productOptions.length}`}
            className="entity-form__select"
            value={selectedProducts}
            onChange={(options) =>
              onInputChange({
                target: {
                  name: "productIds",
                  value: Array.isArray(options)
                    ? options.map((option) => option.value)
                    : [],
                },
              })
            }
            loadOptions={loadProductOptions}
            placeholder="Select products to show under this heading"
            isMulti
          />
          <Errors current_key="productIds" message={localErrors.productIds} />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default StoreNavSectionForm;
