import { Button, Card, Col, Form, Row } from "react-bootstrap";

const SignatureStyleFilters = ({ values, onChange, onReset }) => (
  <Card className="common-panel-card mb-3"><Card.Body>
    <Row className="g-3 align-items-end">
      <Col md={6}><Form.Group><Form.Label>Title</Form.Label><Form.Control name="title" value={values.title} onChange={onChange} /></Form.Group></Col>
      <Col md={6}><Form.Group><Form.Label>Status</Form.Label><Form.Select name="isActive" value={values.isActive} onChange={onChange}><option value="">All</option><option value="true">Active</option><option value="false">Inactive</option></Form.Select></Form.Group></Col>
      <Col xs={12} className="d-flex justify-content-end"><Button className="btn btn--outline" onClick={onReset}>Reset</Button></Col>
    </Row>
  </Card.Body></Card>
);
export default SignatureStyleFilters;
