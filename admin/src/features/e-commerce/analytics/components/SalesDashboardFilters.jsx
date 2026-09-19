import { useCallback, useMemo } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import PropTypes from "prop-types";

import CustomSelect from "@src/components/common/CustomSelect";

const SALES_PERIOD_OPTIONS = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

const getSalesPeriodOption = (value) =>
  SALES_PERIOD_OPTIONS.find((opt) => opt.value === value) ||
  SALES_PERIOD_OPTIONS[0];

const SalesDashboardFilters = ({
  fromDate,
  toDate,
  period,
  onFromDateChange,
  onToDateChange,
  onPeriodChange,
  onApply,
  onReset,
  loading,
}) => {
  const loadPeriodOptions = useCallback(() => SALES_PERIOD_OPTIONS, []);

  const filterErrors = useMemo(() => {
    const errors = {};
    if (fromDate && toDate && fromDate > toDate) {
      errors.toDate = "To date must be on or after from date.";
    }
    return errors;
  }, [fromDate, toDate]);

  const isFilterValid = Object.keys(filterErrors).length === 0;

  return (
    <Card className="common-panel-card sales-dashboard-filters mb-3">
      <Card.Body>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            if (isFilterValid) onApply();
          }}
        >
          <Row className="g-3 align-items-end">
            <Col xs={12} sm={6} lg={3}>
              <Form.Group>
                <Form.Label className="form-sub-label" htmlFor="sales-from-date">
                  From date
                </Form.Label>
                <Form.Control
                  id="sales-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => onFromDateChange(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Form.Group>
                <Form.Label className="form-sub-label" htmlFor="sales-to-date">
                  To date
                </Form.Label>
                <Form.Control
                  id="sales-to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => onToDateChange(e.target.value)}
                  isInvalid={Boolean(filterErrors.toDate)}
                />
                <div className="form-field-feedback" aria-live="polite">
                  {filterErrors.toDate ? (
                    <Form.Text className="form-error-message">
                      {filterErrors.toDate}
                    </Form.Text>
                  ) : null}
                </div>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Form.Group>
                <Form.Label className="form-sub-label">GMV period</Form.Label>
                <CustomSelect
                  className="entity-form__select"
                  value={getSalesPeriodOption(period)}
                  onChange={(option) => onPeriodChange(option?.value ?? "day")}
                  loadOptions={loadPeriodOptions}
                  placeholder="Select period"
                  isDisabled={loading}
                />
              </Form.Group>
            </Col>
            <Col
              xs={12}
              sm={6}
              lg={3}
              className="d-flex flex-wrap justify-content-lg-end gap-2"
            >
              <Button
                type="button"
                className="btn btn--outline"
                disabled={loading}
                onClick={onReset}
              >
                Reset
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loading || !isFilterValid}
              >
                Apply filters
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
};

SalesDashboardFilters.propTypes = {
  fromDate: PropTypes.string,
  toDate: PropTypes.string,
  period: PropTypes.string,
  onFromDateChange: PropTypes.func.isRequired,
  onToDateChange: PropTypes.func.isRequired,
  onPeriodChange: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default SalesDashboardFilters;
