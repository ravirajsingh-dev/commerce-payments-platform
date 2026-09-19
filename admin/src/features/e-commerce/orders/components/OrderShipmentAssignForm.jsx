import { Col, Form, Row } from "react-bootstrap";
import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";
import {
  findFulfillmentModeOption,
  isOfflineFulfillmentMode,
  loadActiveCarrierOptions,
  loadFulfillmentModeOptions,
} from "../shipment/shipmentHelpers";

const OrderShipmentAssignForm = ({
  form,
  onChange,
  disabled = false,
  carrierValue = null,
  onCarrierChange,
}) => {
  const handleField = (name) => (e) => {
    onChange({ ...form, [name]: e.target.value });
  };

  const offlineMode = isOfflineFulfillmentMode(form.fulfillmentMode);
  const fulfillmentModeValue = findFulfillmentModeOption(form.fulfillmentMode);

  return (
    <Row className="g-3">
      <Col xs={12} md={6}>
        <Form.Group>
          <Form.Label className="form-sub-label">Fulfillment</Form.Label>
          <CustomSelect
            value={fulfillmentModeValue}
            onChange={(option) => {
              onCarrierChange?.(null);
              onChange({
                ...form,
                fulfillmentMode: option?.value ?? "",
                carrierId: "",
              });
            }}
            loadOptions={loadFulfillmentModeOptions}
            isDisabled={disabled}
            isRequired
            placeholder="Online or offline"
          />
          <Errors current_key="fulfillmentMode" />
        </Form.Group>
      </Col>
      <Col xs={12} md={6}>
        <Form.Group>
          <Form.Label className="form-sub-label">Carrier</Form.Label>
          <CustomSelect
            key={form.fulfillmentMode}
            className="admin-order-shipment__carrier-select"
            value={carrierValue}
            onChange={(option) => {
              onCarrierChange?.(option);
              onChange({
                ...form,
                carrierId: option?.value ?? "",
              });
            }}
            loadOptions={() => loadActiveCarrierOptions(form.fulfillmentMode)}
            isDisabled={disabled || !form.fulfillmentMode}
            isRequired
            placeholder="Select carrier"
          />
          <Errors current_key="carrierId" />
        </Form.Group>
      </Col>
      <Col xs={12} md={6}>
        <Form.Group>
          <Form.Label className="form-sub-label">
            {offlineMode ? "Reference (optional)" : "Tracking number (AWB)"}
          </Form.Label>
          <Form.Control
            type="text"
            name="trackingNumber"
            value={form.trackingNumber}
            onChange={handleField("trackingNumber")}
            disabled={disabled}
            maxLength={80}
            placeholder={
              offlineMode
                ? "Receipt no., bus seat, etc. (defaults to order no.)"
                : "Enter AWB / tracking number"
            }
          />
          <Errors current_key="trackingNumber" />
        </Form.Group>
      </Col>
      <Col xs={12} md={6}>
        <Form.Group>
          <Form.Label className="form-sub-label">
            Estimated delivery (optional)
          </Form.Label>
          <Form.Control
            type="date"
            name="estimatedDeliveryDate"
            value={form.estimatedDeliveryDate}
            onChange={handleField("estimatedDeliveryDate")}
            disabled={disabled}
          />
          <Errors current_key="estimatedDeliveryDate" />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default OrderShipmentAssignForm;
