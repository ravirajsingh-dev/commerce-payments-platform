import { useCallback } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import CustomSelect from "@src/components/common/CustomSelect";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const getStatusFilterValue = (value) =>
  STATUS_FILTER_OPTIONS.find((o) => String(o.value) === String(value)) ??
  STATUS_FILTER_OPTIONS[0];

const ClienteleFilters = ({ values, onChange, onReset }) => {
  const loadStatusFilterOptions = useCallback(
    () => ({ data: STATUS_FILTER_OPTIONS }),
    [],
  );

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3 align-items-end">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Client Name</Form.Label>
              <Form.Control
                name="name"
                value={values.name}
                onChange={onChange}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getStatusFilterValue(values.isActive)}
                onChange={(option) =>
                  onChange({
                    target: {
                      name: "isActive",
                      value: option?.value ?? "",
                    },
                  })
                }
                loadOptions={loadStatusFilterOptions}
                placeholder="All statuses"
              />
            </Form.Group>
          </Col>
          <Col xs={12} className="d-flex justify-content-end">
            <Button className="btn btn--outline" onClick={onReset}>
              Reset
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ClienteleFilters;
