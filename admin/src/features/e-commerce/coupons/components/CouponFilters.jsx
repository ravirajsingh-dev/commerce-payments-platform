import { useCallback } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import {
  COUPON_STATUS_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
  getCouponStatusOptionByValue,
  getDiscountTypeOptionByValue,
} from "../couponHelpers";

const CouponFilters = ({ values, onChange, onSearch, onReset }) => {
  const loadStatusOptions = useCallback(() => COUPON_STATUS_OPTIONS, []);
  const loadDiscountTypeOptions = useCallback(() => DISCOUNT_TYPE_OPTIONS, []);

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3 align-items-end">
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>Code</Form.Label>
              <Form.Control
                name="code"
                value={values.code}
                onChange={onChange}
                placeholder="Filter by code"
                style={{ textTransform: "uppercase" }}
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>Title</Form.Label>
              <Form.Control
                name="title"
                value={values.title}
                onChange={onChange}
                placeholder="Filter by title"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>Discount type</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getDiscountTypeOptionByValue(values.discountType)}
                onChange={(option) =>
                  onChange({
                    target: { name: "discountType", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadDiscountTypeOptions}
                placeholder="All types"
                isClearable
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getCouponStatusOptionByValue(values.status)}
                onChange={(option) =>
                  onChange({
                    target: { name: "status", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadStatusOptions}
                placeholder="All statuses"
                isClearable
              />
            </Form.Group>
          </Col>
          <Col xs={12} className="d-flex justify-content-end gap-2 mt-3">
            <Button type="button" className="btn btn--outline" onClick={onReset}>
              Reset
            </Button>
            <Button type="button" className="btn btn--theme btn--disabled-theme" onClick={onSearch}>
              Search
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default CouponFilters;
