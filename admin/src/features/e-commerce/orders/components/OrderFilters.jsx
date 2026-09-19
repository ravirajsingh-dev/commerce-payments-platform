import PropTypes from "prop-types";
import { Button, Col, Form, Row } from "react-bootstrap";

import {
  STATUS_LIST,
  PAYMENT_STATUS_OPTIONS,
} from "../orderHelpers";

const OrderFilters = ({ values, onChange, onSearch, onReset }) => (
  <div className="common-filter-panel mb-3">
    <Row className="g-3">
      <Col md={4} lg={3}>
        <Form.Group>
          <Form.Label className="form-sub-label">Order number</Form.Label>
          <Form.Control
            type="text"
            name="orderNo"
            value={values.orderNo}
            onChange={onChange}
            placeholder="RW2605178K2XQ1"
          />
        </Form.Group>
      </Col>
      <Col md={4} lg={3}>
        <Form.Group>
          <Form.Label className="form-sub-label">Order status</Form.Label>
          <Form.Select name="status" value={values.status} onChange={onChange}>
            <option value="">All</option>
            {STATUS_LIST.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>
      <Col md={4} lg={3}>
        <Form.Group>
          <Form.Label className="form-sub-label">Payment status</Form.Label>
          <Form.Select
            name="paymentStatus"
            value={values.paymentStatus}
            onChange={onChange}
          >
            <option value="">All</option>
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>
      <Col md={4} lg={3}>
        <Form.Group>
          <Form.Label className="form-sub-label">User ID</Form.Label>
          <Form.Control
            type="text"
            name="userId"
            value={values.userId}
            onChange={onChange}
            placeholder="MongoDB user id"
          />
        </Form.Group>
      </Col>
      <Col md={4} lg={3}>
        <Form.Group>
          <Form.Label className="form-sub-label">From date</Form.Label>
          <Form.Control
            type="date"
            name="fromDate"
            value={values.fromDate}
            onChange={onChange}
          />
        </Form.Group>
      </Col>
      <Col md={4} lg={3}>
        <Form.Group>
          <Form.Label className="form-sub-label">To date</Form.Label>
          <Form.Control
            type="date"
            name="toDate"
            value={values.toDate}
            onChange={onChange}
          />
        </Form.Group>
      </Col>
      <Col md={4} lg={3} className="d-flex align-items-end">
        <Form.Group className="mb-3 w-100">
          <Form.Check
            type="checkbox"
            id="order-filter-pending-cancel"
            name="pendingCancelRequest"
            label="Pending cancel requests only"
            checked={Boolean(values.pendingCancelRequest)}
            onChange={(e) =>
              onChange({
                target: {
                  name: "pendingCancelRequest",
                  value: e.target.checked,
                },
              })
            }
          />
        </Form.Group>
      </Col>
      <Col md={4} lg={3} className="d-flex align-items-end">
        <Form.Group className="mb-3 w-100">
          <Form.Check
            type="checkbox"
            id="order-filter-pending-claim"
            name="pendingClaim"
            label="Pending claims only"
            checked={Boolean(values.pendingClaim)}
            onChange={(e) =>
              onChange({
                target: {
                  name: "pendingClaim",
                  value: e.target.checked,
                },
              })
            }
          />
        </Form.Group>
      </Col>
    </Row>
    <div className="d-flex gap-2 mt-3">
      <Button type="button" className="btn btn--theme" onClick={onSearch}>
        Apply filters
      </Button>
      <Button type="button" className="btn btn--outline" onClick={onReset}>
        Reset
      </Button>
    </div>
  </div>
);

OrderFilters.propTypes = {
  values: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};

export default OrderFilters;
