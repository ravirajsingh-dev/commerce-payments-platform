import { useCallback, useMemo } from "react";
import { Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";
import {
  FULFILLMENT_MODE,
  FULFILLMENT_MODE_LIST,
  isOfflineFulfillmentMode,
} from "@src/constants/carrier";

const STATUS_OPTIONS = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];

const getStatusOptionByValue = (value) => {
  const normalized = value === true || value === "true";
  return STATUS_OPTIONS.find((item) => item.value === normalized) || null;
};

const getFulfillmentModeOption = (value) => {
  const normalized = String(value || FULFILLMENT_MODE.ONLINE.value).trim();
  return (
    FULFILLMENT_MODE_LIST.find((item) => item.value === normalized) ||
    FULFILLMENT_MODE_LIST[0]
  );
};

const CarrierFormFields = ({
  formData,
  onInputChange,
  onFieldBlur,
  localErrors = {},
}) => {
  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);
  const loadFulfillmentModeOptions = useCallback(() => FULFILLMENT_MODE_LIST, []);
  const offlineMode = useMemo(
    () => isOfflineFulfillmentMode(formData.fulfillmentMode),
    [formData.fulfillmentMode],
  );

  const handleBlur = (e) => {
    onFieldBlur?.(e.target?.name);
  };

  return (
    <Row className="g-3">
      <Col md={6}>
        <Form.Group>
          <Form.Label>Name *</Form.Label>
          <Form.Control
            name="name"
            value={formData.name}
            onChange={onInputChange}
            onBlur={handleBlur}
            maxLength={120}
            placeholder="e.g. Delhivery"
          />
          <Errors current_key="name" message={localErrors.name} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Slug *</Form.Label>
          <Form.Control name="slug" value={formData.slug} readOnly maxLength={140} />
          <Errors current_key="slug" message={localErrors.slug} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Fulfillment *</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getFulfillmentModeOption(formData.fulfillmentMode)}
            onChange={(option) =>
              onInputChange({
                target: {
                  name: "fulfillmentMode",
                  value: option?.value ?? FULFILLMENT_MODE.ONLINE.value,
                },
              })
            }
            loadOptions={loadFulfillmentModeOptions}
            placeholder="Online or offline"
            isRequired
          />
          <Form.Text className="text-muted">
            Offline: showroom pickup, self pickup, bus, hand delivery, etc.
          </Form.Text>
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>{offlineMode ? "Tracking URL (optional)" : "Tracking URL *"}</Form.Label>
          <Form.Control
            name="trackingUrl"
            value={formData.trackingUrl}
            onChange={onInputChange}
            onBlur={handleBlur}
            maxLength={500}
            placeholder={
              offlineMode
                ? "Leave empty if there is no public tracking page"
                : "https://track.example.com/?awb={trackingNumber}"
            }
          />
          <Form.Text className="text-muted">
            {offlineMode
              ? "Optional link for customer reference."
              : "Full URL used to open shipment tracking (include https://)."}
          </Form.Text>
          <Errors current_key="trackingUrl" message={localErrors.trackingUrl} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getStatusOptionByValue(formData.isActive)}
            onChange={(option) =>
              onInputChange({
                target: { name: "isActive", value: option?.value ?? true },
              })
            }
            loadOptions={loadStatusOptions}
            placeholder="Select status"
            isRequired
          />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default CarrierFormFields;
