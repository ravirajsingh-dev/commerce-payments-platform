import { Col, Form, Row } from "react-bootstrap";
import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";
import {
  findTrackingStatusOption,
  loadTrackingEventStatusOptions,
} from "../shipment/shipmentHelpers";

const OrderShipmentEventForm = ({
  form,
  onChange,
  disabled = false,
  excludedStatuses = [],
  forceIncludeStatuses = [],
}) => {
  const handleField = (name) => (e) => {
    onChange({ ...form, [name]: e.target.value });
  };

  const statusValue = findTrackingStatusOption(form.status);

  return (
    <Row className="g-3">
      <Col xs={12} md={6}>
        <Form.Group>
          <Form.Label className="form-sub-label">Status</Form.Label>
          <CustomSelect
            value={statusValue}
            onChange={(option) => {
              onChange({ ...form, status: option?.value ?? "" });
            }}
            loadOptions={() =>
              loadTrackingEventStatusOptions({
                excludedValues: excludedStatuses,
                includeValues: forceIncludeStatuses,
              })
            }
            isDisabled={disabled}
            isRequired
            placeholder="Select status"
            selectProps={{
              maxMenuHeight: 999,
              styles: {
                menuList: (base) => ({
                  ...base,
                  maxHeight: "none",
                  overflowY: "visible",
                }),
              },
            }}
          />
          <Errors current_key="status" />
        </Form.Group>
      </Col>
      <Col xs={12} md={6}>
        <Form.Group>
          <Form.Label className="form-sub-label">Event time</Form.Label>
          <Form.Control
            type="datetime-local"
            name="eventAt"
            value={form.eventAt}
            onChange={handleField("eventAt")}
            disabled={disabled}
          />
          <Errors current_key="eventAt" />
        </Form.Group>
      </Col>
      <Col xs={12}>
        <Form.Group>
          <Form.Label className="form-sub-label">Message</Form.Label>
          <Form.Control
            type="text"
            name="message"
            value={form.message}
            onChange={handleField("message")}
            disabled={disabled}
            maxLength={300}
            placeholder="Short update shown to the customer"
          />
          <Errors current_key="message" />
        </Form.Group>
      </Col>
      <Col xs={12} md={6}>
        <Form.Group>
          <Form.Label className="form-sub-label">Location</Form.Label>
          <Form.Control
            type="text"
            name="location"
            value={form.location}
            onChange={handleField("location")}
            disabled={disabled}
            maxLength={120}
            placeholder="City, showroom, or hub name"
          />
          <Errors current_key="location" />
        </Form.Group>
      </Col>
      <Col xs={12} md={6}>
        <Form.Group>
          <Form.Label className="form-sub-label">Internal note (optional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            name="note"
            value={form.note}
            onChange={handleField("note")}
            disabled={disabled}
            maxLength={500}
            placeholder="Visible in admin only"
          />
          <Errors current_key="note" />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default OrderShipmentEventForm;
