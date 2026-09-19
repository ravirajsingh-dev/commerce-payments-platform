import { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";

const StockAdjustmentHistoryFilters = ({
  values,
  reasonOptions = [],
  onChange,
  onSearch,
  onReset,
}) => {
  const reasonSelectOptions = useMemo(
    () => [{ value: "", label: "All reasons" }, ...(reasonOptions || [])],
    [reasonOptions],
  );

  const loadReasonOptions = useCallback(
    () => reasonSelectOptions,
    [reasonSelectOptions],
  );

  const selectedReason =
    reasonSelectOptions.find(
      (item) => String(item.value) === String(values.reason || ""),
    ) ?? reasonSelectOptions[0];

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
              <Form.Label>Reason</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={selectedReason}
                onChange={(option) =>
                  onChange({
                    target: { name: "reason", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadReasonOptions}
                placeholder="All reasons"
                isClearable
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

StockAdjustmentHistoryFilters.propTypes = {
  values: PropTypes.object.isRequired,
  reasonOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ),
  onChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};

export default StockAdjustmentHistoryFilters;
