import { Button, Card, Col, Form, Row } from "react-bootstrap";

const ClaimPolicyFilters = ({ values, onChange, onSearch, onReset }) => (
  <Card className="common-panel-card mb-3">
    <Card.Body>
      <Row className="g-3">
        <Col md={5}>
          <Form.Group>
            <Form.Label>Search</Form.Label>
            <Form.Control
              name="search"
              value={values.search || ""}
              onChange={onChange}
              placeholder="Search by name or code"
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Status</Form.Label>
            <Form.Select name="isActive" value={values.isActive ?? ""} onChange={onChange}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4} className="d-flex align-items-end gap-2">
          <Button type="button" className="btn btn--theme" onClick={onSearch}>
            Search
          </Button>
          <Button type="button" className="btn btn--outline" onClick={onReset}>
            Reset
          </Button>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

export default ClaimPolicyFilters;
