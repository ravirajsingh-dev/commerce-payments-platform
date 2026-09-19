import { useCallback } from "react";
import PropTypes from "prop-types";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import { STOCK_LEVEL_FILTER } from "../inventoryHelpers";

const STOCK_LEVEL_OPTIONS = [
  { value: STOCK_LEVEL_FILTER.ALL, label: "All low stock" },
  { value: STOCK_LEVEL_FILTER.OUT, label: "Out of stock only" },
  { value: STOCK_LEVEL_FILTER.LOW, label: "In stock but low" },
];

const INCLUDE_INACTIVE_OPTIONS = [
  { value: "false", label: "Active variants only" },
  { value: "true", label: "Include inactive variants" },
];

const getStockLevelOption = (value) =>
  STOCK_LEVEL_OPTIONS.find((item) => String(item.value) === String(value ?? "")) ??
  STOCK_LEVEL_OPTIONS[0];

const getIncludeInactiveOption = (includeInactive) =>
  INCLUDE_INACTIVE_OPTIONS.find(
    (item) => item.value === String(Boolean(includeInactive)),
  ) ?? INCLUDE_INACTIVE_OPTIONS[0];

const LowStockFilters = ({ values, onChange, onSearch, onReset }) => {
  const loadStockLevelOptions = useCallback(() => STOCK_LEVEL_OPTIONS, []);
  const loadIncludeInactiveOptions = useCallback(() => INCLUDE_INACTIVE_OPTIONS, []);

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3 align-items-end">
          <Col xs={12} md={6} lg={4}>
            <Form.Group>
              <Form.Label>SKU</Form.Label>
              <Form.Control
                type="text"
                name="sku"
                value={values.sku}
                onChange={onChange}
                placeholder="Filter by SKU"
                autoComplete="off"
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Form.Group>
              <Form.Label>Product name</Form.Label>
              <Form.Control
                type="text"
                name="productName"
                value={values.productName}
                onChange={onChange}
                placeholder="Filter by product"
                autoComplete="off"
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Form.Group>
              <Form.Label>Stock level</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getStockLevelOption(values.stockLevel)}
                onChange={(option) =>
                  onChange({
                    target: {
                      name: "stockLevel",
                      value: option?.value ?? STOCK_LEVEL_FILTER.ALL,
                    },
                  })
                }
                loadOptions={loadStockLevelOptions}
                placeholder="All low stock"
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Form.Group>
              <Form.Label>Variants</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getIncludeInactiveOption(values.includeInactive)}
                onChange={(option) =>
                  onChange({
                    target: {
                      name: "includeInactive",
                      value: option?.value === "true",
                      type: "checkbox",
                      checked: option?.value === "true",
                    },
                  })
                }
                loadOptions={loadIncludeInactiveOptions}
                placeholder="Active variants only"
              />
            </Form.Group>
          </Col>
          <Col xs={12} className="d-flex justify-content-end gap-2 mt-3">
            <Button type="button" className="btn btn--outline" onClick={onReset}>
              Reset
            </Button>
            <Button type="button" className="btn btn--theme" onClick={onSearch}>
              Search
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

LowStockFilters.propTypes = {
  values: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};

export default LowStockFilters;
