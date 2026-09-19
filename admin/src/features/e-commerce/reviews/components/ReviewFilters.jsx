import { useCallback } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import {
  RATING_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  getRatingOptionByValue,
  getReviewStatusOptionByValue,
} from "../reviewHelpers";

const ReviewFilters = ({ values, onChange, onSearch, onReset }) => {
  const loadStatusOptions = useCallback(() => REVIEW_STATUS_OPTIONS, []);
  const loadRatingOptions = useCallback(() => RATING_OPTIONS, []);

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3 align-items-end">
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>Product</Form.Label>
              <Form.Control
                name="productName"
                value={values.productName}
                onChange={onChange}
                placeholder="Filter by product name"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>Customer</Form.Label>
              <Form.Control
                name="userName"
                value={values.userName}
                onChange={onChange}
                placeholder="Filter by customer name"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getReviewStatusOptionByValue(values.status)}
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
          <Col md={6} lg={3}>
            <Form.Group>
              <Form.Label>Rating</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getRatingOptionByValue(values.rating)}
                onChange={(option) =>
                  onChange({
                    target: { name: "rating", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadRatingOptions}
                placeholder="All ratings"
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

export default ReviewFilters;
