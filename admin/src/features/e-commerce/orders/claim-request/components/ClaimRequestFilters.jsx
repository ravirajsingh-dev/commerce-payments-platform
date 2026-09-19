import { useCallback } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import { CLAIM_STATUS_FILTER_OPTIONS, getSelectOptionByValue } from "../claimRequestHelpers";

const ClaimRequestFilters = ({ values, onChange, onSearch, onReset }) => {
  const loadStatusOptions = useCallback(() => CLAIM_STATUS_FILTER_OPTIONS, []);

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3">
          <Col xs={12} md={4}>
            <Form.Group>
              <Form.Label>Order number</Form.Label>
              <Form.Control
                name="orderNo"
                value={values.orderNo || ""}
                onChange={onChange}
                placeholder="Filter by order number"
                autoComplete="off"
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={4}>
            <Form.Group>
              <Form.Label>Customer user ID</Form.Label>
              <Form.Control
                name="userId"
                value={values.userId || ""}
                onChange={onChange}
                placeholder="Mongo user id"
                autoComplete="off"
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={4}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getSelectOptionByValue(CLAIM_STATUS_FILTER_OPTIONS, values.status ?? "")}
                onChange={(option) =>
                  onChange({
                    target: { name: "status", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadStatusOptions}
                placeholder="All statuses"
                isRequired
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={4}>
            <Form.Group>
              <Form.Label>Requested from</Form.Label>
              <Form.Control
                type="date"
                name="fromDate"
                value={values.fromDate || ""}
                onChange={onChange}
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={4}>
            <Form.Group>
              <Form.Label>Requested to</Form.Label>
              <Form.Control
                type="date"
                name="toDate"
                value={values.toDate || ""}
                onChange={onChange}
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={4} className="d-flex align-items-end gap-2 flex-wrap">
            <Button type="button" className="btn btn--theme flex-grow-1 flex-md-grow-0" onClick={onSearch}>
              Search
            </Button>
            <Button type="button" className="btn btn--outline flex-grow-1 flex-md-grow-0" onClick={onReset}>
              Reset
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ClaimRequestFilters;
