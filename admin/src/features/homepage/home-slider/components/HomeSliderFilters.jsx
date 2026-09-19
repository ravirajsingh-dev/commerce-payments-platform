import { useCallback } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import CustomSelect from "@src/components/common/CustomSelect";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const getStatusFilterOption = (value) =>
  STATUS_FILTER_OPTIONS.find((item) => String(item.value) === String(value)) ??
  STATUS_FILTER_OPTIONS[0];

const HomeSliderFilters = ({ values, onChange, onSearch, onReset }) => {
  const loadStatusFilterOptions = useCallback(() => STATUS_FILTER_OPTIONS, []);

  return (
    <Card className="common-panel-card mb-3">
      <Card.Body>
        <Row className="g-3 align-items-end">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Heading</Form.Label>
              <Form.Control
                name="heading"
                value={values.heading}
                onChange={onChange}
                placeholder="Filter by heading"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getStatusFilterOption(values.status)}
                onChange={(option) =>
                  onChange({
                    target: { name: "status", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadStatusFilterOptions}
                placeholder="All statuses"
                isClearable
              />
            </Form.Group>
          </Col>
          <Col xs={12} className="d-flex justify-content-end gap-2">
            <Button
              className="btn btn--outline"
              type="button"
              onClick={onReset}
            >
              Reset
            </Button>
            <Button className="btn btn--theme" type="button" onClick={onSearch}>
              Search
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default HomeSliderFilters;
